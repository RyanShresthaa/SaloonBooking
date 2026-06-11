import { useCallback, useEffect, useState } from 'react';
import { getNotificationLogs, markBookingNotificationFinished } from '@/lib/api/notifications';
import { listAuditLogs, type AuditLogRow } from '@/lib/api/audit';
import { connectSocket } from '@/lib/socket';
import AuthGuard from '@/components/layout/AuthGuard';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { getApiErrorMessage } from '@/lib/utils/apiError';

interface NotificationLogRow {
  id: string;
  recipientEmail: string;
  subject: string;
  status: string;
  batchId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  appointmentId?: string | null;
  bookingMarkedFinished?: boolean;
  appointmentData?: { isVip?: boolean; source?: string } | null;
  template?: { name?: string; requiresVip?: boolean };
  sentBy?: { id: string; name?: string; email?: string } | null;
  appointment?: {
    id: string;
    appointmentDate?: string;
    startTime?: string;
    status?: string;
    isVip?: boolean;
    customerName?: string;
    service?: { name?: string };
  } | null;
}

type TabId = 'notifications' | 'audit';

const panelClass =
  'overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-stone-700 dark:bg-stone-900 dark:shadow-none';

const theadClass =
  'border-b border-stone-200 bg-stone-100 text-left text-xs font-semibold uppercase tracking-[0.08em] text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300';

const rowClass =
  'border-b border-stone-100 bg-white transition-colors hover:bg-stone-50/90 last:border-b-0 dark:border-stone-800/80 dark:bg-stone-900 dark:hover:bg-stone-800/60';

export default function LogsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isSalonWide = user?.role === 'admin' || user?.role === 'staff';
  const emptyColSpan = 9 + (isSalonWide ? 1 : 0) + (isAdmin ? 1 : 0);

  const [tab, setTab] = useState<TabId>('notifications');

  const [logs, setLogs] = useState<NotificationLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finishingId, setFinishingId] = useState<string | null>(null);

  const [auditRows, setAuditRows] = useState<AuditLogRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditFilter, setAuditFilter] = useState('');
  const [auditHasMore, setAuditHasMore] = useState(false);
  const pageSize = 40;

  useEffect(() => {
    let cancelled = false;
    getNotificationLogs()
      .then((res) => {
        if (!cancelled) {
          setLogs(Array.isArray(res.data.data) ? res.data.data : []);
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Could not load logs'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchAuditPage = useCallback(
    async (offset: number, append: boolean) => {
      if (!isSalonWide) return;
      setAuditError('');
      setAuditLoading(true);
      try {
        const res = await listAuditLogs({
          limit: pageSize,
          offset,
          entityType: auditFilter.trim() || undefined,
        });
        const rows = (res.data.data || []) as AuditLogRow[];
        if (append) {
          setAuditRows((prev) => [...prev, ...rows]);
        } else {
          setAuditRows(rows);
        }
        setAuditHasMore(rows.length === pageSize);
      } catch (e: unknown) {
        setAuditError(getApiErrorMessage(e, 'Could not load audit trail.'));
      } finally {
        setAuditLoading(false);
      }
    },
    [isSalonWide, auditFilter, pageSize]
  );

  useEffect(() => {
    if (tab !== 'audit' || !isSalonWide) return;
    void fetchAuditPage(0, false);
  }, [tab, auditFilter, isSalonWide, fetchAuditPage]);

  const refreshLogs = useCallback(() => {
    getNotificationLogs()
      .then((res) => {
        setLogs(Array.isArray(res.data.data) ? res.data.data : []);
        setError('');
      })
      .catch((err: unknown) => {
        setError(getApiErrorMessage(err, 'Could not load logs'));
      });
  }, []);

  /** Notification rows and statuses change on the server without this page knowing — listen like the bulk-send screen. */
  useEffect(() => {
    const socket = connectSocket();
    let notifTimer: ReturnType<typeof setTimeout> | undefined;
    let auditTimer: ReturnType<typeof setTimeout> | undefined;

    const onNotificationSocket = () => {
      if (tab !== 'notifications') return;
      clearTimeout(notifTimer);
      notifTimer = setTimeout(() => {
        refreshLogs();
      }, 400);
    };

    const onAppointmentSocket = () => {
      if (!isSalonWide || tab !== 'audit') return;
      clearTimeout(auditTimer);
      auditTimer = setTimeout(() => {
        void fetchAuditPage(0, false);
      }, 400);
    };

    socket.on('notification:update', onNotificationSocket);
    socket.on('appointment:updated', onAppointmentSocket);

    return () => {
      clearTimeout(notifTimer);
      clearTimeout(auditTimer);
      socket.off('notification:update', onNotificationSocket);
      socket.off('appointment:updated', onAppointmentSocket);
    };
  }, [tab, isSalonWide, refreshLogs, fetchAuditPage]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (tab === 'notifications') refreshLogs();
      if (tab === 'audit' && isSalonWide) void fetchAuditPage(0, false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [tab, isSalonWide, refreshLogs, fetchAuditPage]);

  const handleMarkFinished = async (id: string) => {
    setFinishingId(id);
    try {
      await markBookingNotificationFinished(id);
      refreshLogs();
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, 'Could not update'));
    } finally {
      setFinishingId(null);
    }
  };

  const applyAuditFilter = () => {
    void fetchAuditPage(0, false);
  };

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        <div className="rounded-xl border border-stone-200 bg-white px-6 py-8 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">Mailroom</p>
          <h1 className="font-display text-3xl text-stone-900 dark:text-stone-50 sm:text-4xl">Logs</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            {isAdmin
              ? 'Notification sends and an audit trail of important booking changes. Both views use a clean white workspace for easier scanning.'
              : isSalonWide
                ? 'Notification activity and audit events for the salon desk. These lists refresh when the server broadcasts updates (socket) or when you switch back to the tab.'
                : 'Only rows where the recipient email matches the address you sign in with. The list refreshes when sends update, over the socket, or when you return to this tab.'}
          </p>

          {isSalonWide ? (
            <div
              className="mt-8 inline-flex rounded-lg border border-stone-200 bg-stone-50 p-1 dark:border-stone-600 dark:bg-stone-800/80"
              role="tablist"
              aria-label="Log type"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'notifications'}
                onClick={() => setTab('notifications')}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === 'notifications'
                    ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-950 dark:text-stone-50'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                }`}
              >
                Notifications
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'audit'}
                onClick={() => setTab('audit')}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === 'audit'
                    ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-950 dark:text-stone-50'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                }`}
              >
                Audit trail
              </button>
            </div>
          ) : null}
        </div>

        {tab === 'notifications' && (
          <>
            {error && (
              <div
                className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-900 shadow-sm dark:border-red-900/50 dark:bg-stone-900 dark:text-red-200"
                role="alert"
              >
                {error}
              </div>
            )}

            {loading ? (
              <div className={`${panelClass} flex justify-center py-20`} role="status" aria-label="Loading logs">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-700 dark:border-stone-700 dark:border-t-stone-200" />
              </div>
            ) : (
              <div className={`${panelClass} overflow-x-auto`}>
                <table className="min-w-full text-sm text-stone-800 dark:text-stone-200">
                  <thead className={theadClass}>
                    <tr>
                      <th className="px-4 py-3 font-medium">When</th>
                      <th className="px-4 py-3 font-medium">Recipient</th>
                      <th className="px-4 py-3 font-medium">Template</th>
                      <th className="px-4 py-3 font-medium">Subject</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      {isSalonWide ? <th className="px-4 py-3 font-medium">Sent by</th> : null}
                      <th className="px-4 py-3 font-medium">Booking</th>
                      <th className="px-4 py-3 font-medium">VIP</th>
                      <th className="px-4 py-3 font-medium">Follow-up</th>
                      <th className="px-4 py-3 font-medium">Batch</th>
                      {isAdmin ? <th className="w-32 px-4 py-3 font-medium" /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={emptyColSpan} className="px-4 py-12 text-center text-sm text-stone-500 dark:text-stone-400">
                          {isSalonWide ? 'No logs yet.' : 'No notifications to your email yet.'}
                        </td>
                      </tr>
                    ) : (
                      logs.map((row) => (
                        <tr key={row.id} className={rowClass}>
                          <td className="whitespace-nowrap px-4 py-3 text-stone-600 dark:text-stone-400">
                            {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3">{row.recipientEmail}</td>
                          <td className="px-4 py-3">
                            <div>{row.template?.name ?? '—'}</div>
                            {row.template?.requiresVip ? (
                              <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">VIP template</span>
                            ) : null}
                          </td>
                          <td className="max-w-xs truncate px-4 py-3" title={row.subject}>
                            {row.subject}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                row.status === 'sent'
                                  ? 'font-medium text-emerald-700 dark:text-emerald-400'
                                  : row.status === 'failed'
                                    ? 'font-medium text-red-700 dark:text-red-400'
                                    : row.status === 'declined'
                                      ? 'font-medium text-stone-500'
                                      : row.status === 'pending_approval'
                                        ? 'font-medium text-amber-800 dark:text-amber-300'
                                        : 'font-medium text-stone-600 dark:text-stone-400'
                              }
                            >
                              {row.status}
                            </span>
                            {row.errorMessage ? (
                              <p className="mt-1 max-w-xs truncate text-xs text-red-600 dark:text-red-400" title={row.errorMessage}>
                                {row.errorMessage}
                              </p>
                            ) : null}
                          </td>
                          {isSalonWide ? (
                            <td className="px-4 py-3 text-xs text-stone-700 dark:text-stone-300">
                              {row.appointmentData?.source === 'reminder' && row.sentBy ? (
                                <span>
                                  {row.sentBy.name ?? '—'}
                                  <span className="mt-0.5 block font-mono text-[10px] text-stone-500 dark:text-stone-500">
                                    {row.sentBy.email}
                                  </span>
                                </span>
                              ) : row.appointmentData?.source === 'reminder' ? (
                                <span className="text-stone-500">—</span>
                              ) : (
                                <span className="text-stone-500 dark:text-stone-500">Bulk / system</span>
                              )}
                            </td>
                          ) : null}
                          <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
                            {row.appointment ? (
                              <div className="space-y-0.5">
                                <div className="font-mono text-xs text-stone-500 dark:text-stone-500">{row.appointment.id.slice(0, 8)}…</div>
                                <div className="text-xs">
                                  {row.appointment.appointmentDate} {row.appointment.startTime}
                                </div>
                                <div className="text-xs capitalize">{row.appointment.status}</div>
                                <div className="text-xs text-stone-600 dark:text-stone-400">{row.appointment.service?.name}</div>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.appointment?.isVip || row.appointmentData?.isVip ? 'Yes' : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-stone-700 dark:text-stone-300">
                            {row.appointmentId
                              ? row.bookingMarkedFinished
                                ? 'Finished'
                                : row.status === 'sent'
                                  ? 'Pending'
                                  : '—'
                              : '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-stone-500 dark:text-stone-500">
                            {row.batchId ? row.batchId.slice(0, 8) + '…' : '—'}
                          </td>
                          {isAdmin ? (
                            <td className="px-4 py-3">
                              {row.appointmentId && row.status === 'sent' && !row.bookingMarkedFinished ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  loading={finishingId === row.id}
                                  disabled={finishingId === row.id}
                                  onClick={() => void handleMarkFinished(row.id)}
                                >
                                  Finish
                                </Button>
                              ) : null}
                            </td>
                          ) : null}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'audit' && isSalonWide && (
          <div className="space-y-4">
            <div className={`${panelClass} p-4 sm:p-5`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Input
                    label="Filter by entity type"
                    placeholder="e.g. appointment"
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyAuditFilter();
                    }}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={() => applyAuditFilter()}>
                  Apply
                </Button>
              </div>
            </div>

            {auditError && (
              <div
                className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-900 shadow-sm dark:border-red-900/50 dark:bg-stone-900 dark:text-red-200"
                role="alert"
              >
                {auditError}
              </div>
            )}

            <div className={`${panelClass} overflow-x-auto`}>
              {auditLoading && auditRows.length === 0 ? (
                <div className="flex justify-center py-20" role="status" aria-label="Loading audit log">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-700 dark:border-stone-700 dark:border-t-stone-200" />
                </div>
              ) : (
                <table className="min-w-full text-sm text-stone-800 dark:text-stone-200">
                  <thead className={theadClass}>
                    <tr>
                      <th className="px-4 py-3 font-medium">When</th>
                      <th className="px-4 py-3 font-medium">Actor</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Entity</th>
                      <th className="px-4 py-3 font-medium">Entity ID</th>
                      <th className="min-w-[12rem] px-4 py-3 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-stone-500 dark:text-stone-400">
                          No audit events yet. Actions on appointments will appear here.
                        </td>
                      </tr>
                    ) : (
                      auditRows.map((row) => (
                        <tr key={row.id} className={rowClass}>
                          <td className="whitespace-nowrap px-4 py-3 text-stone-600 dark:text-stone-400">
                            {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {row.actor ? (
                              <>
                                <div className="font-medium text-stone-900 dark:text-stone-100">{row.actor.name ?? '—'}</div>
                                <div className="mt-0.5 text-stone-500 dark:text-stone-500">{row.actor.email}</div>
                              </>
                            ) : (
                              <span className="text-stone-500">System</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-stone-800 dark:text-stone-200">{row.action}</td>
                          <td className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-stone-600 dark:text-stone-400">
                            {row.entityType}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-stone-600 dark:text-stone-400">
                            {row.entityId ? `${row.entityId.slice(0, 8)}…` : '—'}
                          </td>
                          <td className="max-w-md px-4 py-3">
                            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md border border-stone-100 bg-stone-50 p-2 text-[11px] leading-snug text-stone-700 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-300">
                              {row.metadata ? JSON.stringify(row.metadata, null, 2) : '—'}
                            </pre>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {auditHasMore && auditRows.length > 0 ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  loading={auditLoading}
                  onClick={() => void fetchAuditPage(auditRows.length, true)}
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
