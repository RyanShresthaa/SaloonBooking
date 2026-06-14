import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { listTemplates } from '@/lib/api/templates';
import {
  bulkNotify,
  getNotificationLogs,
  listBulkBatches,
  approveNotificationLog,
  declineNotificationLog,
  approveAllInBatch,
  markBookingNotificationFinished,
} from '@/lib/api/notifications';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// ─── Constants ───

const BATCH_LOG_POLL_MS = 1500;

// ─── Types ───

interface Template {
  id: string;
  name: string;
  requiresVip?: boolean;
}

type LogStatus = 'pending_approval' | 'queued' | 'processing' | 'sent' | 'failed' | 'declined';

interface ProgressItem {
  logId: string;
  batchId: string;
  recipientEmail: string;
  status: LogStatus;
  error?: string;
  appointmentId?: string | null;
  requiresVipTemplate?: boolean;
  bookingMarkedFinished?: boolean;
  appointmentData?: {
    customerName?: string;
    serviceName?: string;
    date?: string;
    time?: string;
    isVip?: boolean;
  };
}

interface BulkBatchRow {
  batchId: string;
  startedAt: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  awaitingApproval?: number;
}

// ─── Helpers ───

function statusClass(status: LogStatus) {
  if (status === 'sent') return 'text-green-600';
  if (status === 'failed') return 'text-red-600';
  if (status === 'declined') return 'text-stone-600';
  if (status === 'pending_approval') return 'text-amber-900';
  return 'text-stone-600';
}

// ─── Exports ───

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canBulk = user?.role === 'admin' || user?.role === 'staff';
  /** Approve / decline / mark finished: salon desk only (must belong to a salon); never platform super_admin. */
  const canModerateBookingMessages =
    user?.role !== 'super_admin' &&
    Boolean(user?.salonId) &&
    (user?.role === 'admin' || user?.role === 'staff');
  const isSalonWide = user?.role === 'admin' || user?.role === 'staff';

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [expectedTotal, setExpectedTotal] = useState(0);
  const [batches, setBatches] = useState<BulkBatchRow[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);

  const loadBatches = useCallback(() => {
    setBatchesLoading(true);
    listBulkBatches()
      .then((res) => setBatches(Array.isArray(res.data.data) ? res.data.data : []))
      .catch(() => setBatches([]))
      .finally(() => setBatchesLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void listTemplates().then((res) => setTemplates(res.data.data));
      loadBatches();
    });
  }, [loadBatches]);

  useEffect(() => {
    if (!batchId) return;

    const socket = connectSocket();

    const onNotificationUpdate = (data: Partial<ProgressItem> & { logId: string; batchId?: string | null }) => {
      if (data.batchId === batchId) {
        setProgress((prev) => {
          const existing = prev.find((p) => p.logId === data.logId);
          if (existing) {
            return prev.map((p) => (p.logId === data.logId ? { ...p, ...data } : p));
          }
          return [
            ...prev,
            {
              logId: data.logId,
              batchId: data.batchId || batchId,
              recipientEmail: data.recipientEmail || '',
              status: (data.status as LogStatus) || 'queued',
              error: data.error,
              bookingMarkedFinished: data.bookingMarkedFinished,
            },
          ];
        });
      }
    };

    socket.on('notification:update', onNotificationUpdate);

    return () => {
      socket.off('notification:update', onNotificationUpdate);
      disconnectSocket();
    };
  }, [batchId]);

  useEffect(() => {
    if (!batchId) return;

    const syncBatchLogs = async () => {
      try {
        const res = await getNotificationLogs(batchId);
        const logs = res.data.data || [];
        setProgress(
          logs.map(
            (log: {
              id: string;
              batchId: string;
              recipientEmail: string;
              status: LogStatus;
              appointmentId?: string | null;
              bookingMarkedFinished?: boolean;
              appointmentData?: ProgressItem['appointmentData'];
              template?: { requiresVip?: boolean };
            }) => ({
              logId: log.id,
              batchId: log.batchId,
              recipientEmail: log.recipientEmail,
              status: log.status,
              appointmentId: log.appointmentId,
              requiresVipTemplate: log.template?.requiresVip,
              bookingMarkedFinished: log.bookingMarkedFinished,
              appointmentData: log.appointmentData,
            }),
          ),
        );
      } catch {
        // Socket stream remains authoritative if this snapshot fails.
      }
    };

    void syncBatchLogs();
    const intervalId = setInterval(syncBatchLogs, BATCH_LOG_POLL_MS);
    return () => clearInterval(intervalId);
  }, [batchId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: !canBulk,
    onDrop: (acceptedFiles) => setFile(acceptedFiles[0]),
  });

  const openBatch = (id: string, total: number) => {
    setExpectedTotal(total || 0);
    setBatchId(id);
  };

  const handleUpload = async () => {
    if (!file || !selectedTemplate) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateId', selectedTemplate);

    try {
      const res = await bulkNotify(formData);
      const { batchId: newBatchId, total, autoDeclined } = res.data.data;
      openBatch(newBatchId, total || 0);
      void loadBatches();
      if (autoDeclined && autoDeclined > 0) {
        alert(
          `${autoDeclined} row(s) were auto-declined (VIP-only template needs appointmentId + VIP booking, or email must match the appointment).`,
        );
      }
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert(message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (logId: string) => {
    setApprovingId(logId);
    try {
      await approveNotificationLog(logId);
      void loadBatches();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert(message || 'Approve failed');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDecline = async (logId: string) => {
    if (!confirm('Decline this message? It will not be sent.')) return;
    setDecliningId(logId);
    try {
      await declineNotificationLog(logId);
      void loadBatches();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert(message || 'Decline failed');
    } finally {
      setDecliningId(null);
    }
  };

  const handleMarkBookingFinished = async (logId: string) => {
    setFinishingId(logId);
    try {
      await markBookingNotificationFinished(logId);
      void loadBatches();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert(message || 'Could not mark finished');
    } finally {
      setFinishingId(null);
    }
  };

  const canApproveByVipRules = (p: ProgressItem) =>
    !p.requiresVipTemplate || Boolean(p.appointmentData?.isVip);

  const sentCount = progress.filter((p) => p.status === 'sent').length;
  const failedCount = progress.filter((p) => p.status === 'failed').length;
  const declinedCount = progress.filter((p) => p.status === 'declined').length;
  const pendingApprovalCount = progress.filter((p) => p.status === 'pending_approval').length;
  const inFlightCount = progress.filter((p) => p.status === 'queued' || p.status === 'processing').length;
  const totalCount = expectedTotal || progress.length;

  const handleApproveAll = async () => {
    if (!batchId) return;
    if (!confirm(`Approve all pending messages in this batch (${pendingApprovalCount})?`)) return;
    setApprovingAll(true);
    try {
      await approveAllInBatch(batchId);
      void loadBatches();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert(message || 'Approve all failed');
    } finally {
      setApprovingAll(false);
    }
  };

  return (
    <AuthGuard>
      <div className="page-shell-bulk">
        <header className="page-header">
          <p className="page-eyebrow">Communications</p>
          <h1 className="page-title">Bulk notifications</h1>
          <p className="page-lede max-w-2xl">
            {canBulk
              ? 'Choose a template, upload recipients, then an admin reviews and approves each message before anything is sent.'
              : 'Bulk sends you were included on (same history staff see for the whole salon, filtered to you).'}
          </p>
        </header>

        <section className="surface-card overflow-hidden rounded-lg" aria-label="Recent bulk sends">
          <div className="border-b border-stone-200/80 bg-[#ebe6df] px-4 py-3 dark:border-stone-700 dark:bg-stone-800/80">
            <h2 className="text-sm font-medium text-stone-900 dark:text-stone-100">Recent bulk sends</h2>
            <p className="text-xs text-stone-600 mt-0.5 dark:text-stone-400">
              {isSalonWide
                ? 'All batches from the salon. Click a row to open review and delivery status.'
                : 'Only batches where you appear as a recipient.'}
            </p>
          </div>
          {batchesLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" aria-hidden />
            </div>
          ) : batches.length === 0 ? (
            <p className="text-sm text-stone-500 px-4 py-8 text-center">No bulk batches yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="data-table-head">
                  <tr>
                    <th className="px-4 py-2 font-medium">Started</th>
                    <th className="px-4 py-2 font-medium">Batch</th>
                    <th className="px-4 py-2 font-medium">Total</th>
                    <th className="px-4 py-2 font-medium text-green-700">Sent</th>
                    <th className="px-4 py-2 font-medium text-red-700">Failed / declined</th>
                    {isSalonWide ? (
                      <th className="px-4 py-2 font-medium text-amber-900/90">Awaiting approval</th>
                    ) : null}
                    <th className="px-4 py-2 font-medium text-amber-700">In queue / sending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/80">
                  {batches.map((b) => (
                    <tr
                      key={b.batchId}
                      onClick={() => isSalonWide && openBatch(b.batchId, b.total)}
                      className={`text-stone-800 ${isSalonWide ? 'cursor-pointer hover:bg-stone-50' : ''}`}
                    >
                      <td className="px-4 py-2 whitespace-nowrap text-stone-600">
                        {b.startedAt ? new Date(b.startedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{b.batchId ? `${b.batchId.slice(0, 8)}…` : '—'}</td>
                      <td className="px-4 py-2">{b.total}</td>
                      <td className="px-4 py-2">{b.sent}</td>
                      <td className="px-4 py-2">{b.failed}</td>
                      {isSalonWide ? <td className="px-4 py-2">{b.awaitingApproval ?? '—'}</td> : null}
                      <td className="px-4 py-2">{Math.max(0, (b.pending || 0) - (b.awaitingApproval || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {!batchId ? (
          <section className="surface-card space-y-5 rounded-lg p-6" aria-label="Upload bulk notifications">
            {!canBulk && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3">
                Only salon staff and admins can upload bulk Excel files. You can still see batches that included your
                email above.
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-stone-700">Select Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                disabled={!canBulk}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm transition focus-ring disabled:bg-stone-100 disabled:text-stone-500"
              >
                <option value="">Choose a template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.requiresVip ? ' (VIP — needs appointmentId)' : ''}
                  </option>
                ))}
              </select>
              {templates.find((x) => x.id === selectedTemplate)?.requiresVip ? (
                <p className="text-xs text-amber-800 leading-relaxed">
                  VIP template: include an <code className="bg-amber-100 px-1 rounded text-[11px]">appointmentId</code>{' '}
                  column for each row. The booking must have VIP selected when the customer booked (or set by an admin
                  when editing). The email must match the appointment.
                </p>
              ) : null}
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                !canBulk
                  ? 'border-stone-200 bg-stone-50 cursor-not-allowed opacity-70'
                  : isDragActive
                    ? 'border-stone-800 bg-stone-100 cursor-pointer'
                    : 'border-stone-300 hover:border-stone-500 cursor-pointer'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 text-stone-400 mx-auto mb-3" aria-hidden />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-stone-700">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" aria-hidden />
                  {file.name}
                </div>
              ) : (
                <p className="text-sm text-stone-500">
                  {canBulk ? 'Drag & drop an Excel file here, or click to select' : 'Upload is disabled for your account.'}
                </p>
              )}
            </div>

            <Button onClick={handleUpload} disabled={!canBulk || !file || !selectedTemplate} loading={uploading} className="w-full">
              Upload for admin review
            </Button>
          </section>
        ) : (
          <section className="surface-card space-y-4 rounded-lg p-6" aria-label="Batch review">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setBatchId(null)} className="shrink-0">
                  <ChevronLeft className="h-4 w-4 mr-1 inline" aria-hidden />
                  Back
                </Button>
                <h2 className="text-lg font-semibold text-stone-900">Batch review</h2>
              </div>
              <div className="text-sm text-stone-500">
                {sentCount + failedCount + declinedCount + inFlightCount} / {totalCount} resolved or in flight
              </div>
            </div>

            {!canModerateBookingMessages && pendingApprovalCount > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3">
                This batch has messages awaiting approval. Only that salon&apos;s desk team (linked admin or staff
                account) can approve or decline sends. Platform super admins cannot act on salon booking messages.
              </div>
            )}

            {canModerateBookingMessages && pendingApprovalCount > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleApproveAll} loading={approvingAll} disabled={approvingAll}>
                  Approve all pending ({pendingApprovalCount})
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm" aria-label="Batch delivery summary">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" aria-hidden />
                <span className="text-stone-700">{sentCount} sent</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" aria-hidden />
                <span className="text-stone-700">{failedCount} failed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-stone-500 font-medium" aria-hidden>
                  ⊘
                </span>
                <span className="text-stone-700">{declinedCount} declined</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-amber-900" aria-hidden>
                  ◉
                </span>
                <span className="text-stone-700">{pendingApprovalCount} awaiting approval</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-600 font-medium" aria-hidden>
                  ⏳
                </span>
                <span className="text-stone-700">{inFlightCount} queued / sending</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-700 font-medium" aria-hidden>
                  ✓
                </span>
                <span className="text-stone-700">
                  {progress.filter((p) => p.bookingMarkedFinished).length} booking follow-ups finished
                </span>
              </div>
            </div>

            <div className="max-h-96 overflow-auto border rounded-lg border-stone-200/80">
              <table className="min-w-full text-sm">
                <thead className="bg-stone-50 text-left text-stone-600 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-medium">Recipient</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Service</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">VIP</th>
                    <th className="px-3 py-2 font-medium">Booking</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    {canModerateBookingMessages ? <th className="px-3 py-2 font-medium">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/80">
                  {progress.map((p) => (
                    <tr key={p.logId} className="text-stone-800">
                      <td className="px-3 py-2 whitespace-nowrap">{p.recipientEmail}</td>
                      <td className="px-3 py-2">{p.appointmentData?.customerName ?? '—'}</td>
                      <td className="px-3 py-2">{p.appointmentData?.serviceName ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{p.appointmentData?.date ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{p.appointmentData?.time ?? '—'}</td>
                      <td className="px-3 py-2">{p.appointmentData?.isVip ? 'Yes' : '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs text-stone-600">
                        {p.appointmentId ? `${p.appointmentId.slice(0, 8)}…` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`font-medium ${statusClass(p.status)}`}>{p.status}</span>
                        {p.bookingMarkedFinished ? (
                          <p className="text-xs text-green-700 mt-0.5">Follow-up done</p>
                        ) : null}
                        {p.error ? <p className="text-xs text-red-600 mt-0.5 max-w-[12rem] truncate">{p.error}</p> : null}
                      </td>
                      {canModerateBookingMessages ? (
                        <td className="px-3 py-2 whitespace-nowrap align-top">
                          <div className="flex flex-col gap-2 items-start">
                            {p.status === 'pending_approval' ? (
                              <div className="flex gap-1 flex-wrap">
                                <Button
                                  size="sm"
                                  onClick={() => void handleApprove(p.logId)}
                                  disabled={
                                    approvingId === p.logId ||
                                    decliningId === p.logId ||
                                    !canApproveByVipRules(p)
                                  }
                                  loading={approvingId === p.logId}
                                  title={
                                    !canApproveByVipRules(p)
                                      ? 'VIP template requires a VIP booking (appointmentId + VIP flag).'
                                      : undefined
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => void handleDecline(p.logId)}
                                  disabled={approvingId === p.logId || decliningId === p.logId}
                                  loading={decliningId === p.logId}
                                >
                                  Decline
                                </Button>
                              </div>
                            ) : null}
                            {p.status === 'sent' && p.appointmentId && !p.bookingMarkedFinished ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => void handleMarkBookingFinished(p.logId)}
                                loading={finishingId === p.logId}
                                disabled={finishingId === p.logId}
                              >
                                Mark booking finished
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button variant="secondary" onClick={() => navigate('/logs')} className="w-full">
              View All Logs
            </Button>
          </section>
        )}
      </div>
    </AuthGuard>
  );
}
