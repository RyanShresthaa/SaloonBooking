import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listAppointments,
  updateAppointment,
  downloadAppointmentsCsv,
} from '@/lib/api/appointments';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import { Skeleton, TableRowSkeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/utils/apiError';

interface AppointmentRow {
  id: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  appointmentDate: string;
  startTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  isVip?: boolean;
  service?: { name?: string };
  assignedStaff?: { name?: string };
}

type DeskFilter = 'all' | 'today' | 'upcoming';

function WeekStrip({
  weekAnchor,
  selectedDate,
  onSelect,
  counts,
}: {
  weekAnchor: string;
  selectedDate: string;
  onSelect: (iso: string) => void;
  counts: Map<string, number>;
}) {
  const start = dayjs(weekAnchor).startOf('week');
  const days = Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Week view">
      {days.map((d) => {
        const iso = d.format('YYYY-MM-DD');
        const n = counts.get(iso) ?? 0;
        const sel = iso === selectedDate;
        return (
          <button
            key={iso}
            type="button"
            role="tab"
            aria-selected={sel}
            onClick={() => onSelect(iso)}
            className={`min-w-[4.25rem] rounded-lg border px-2 py-2 text-center text-xs transition-colors duration-150 ${
              sel
                ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                : 'border-stone-200 bg-white/80 text-stone-700 hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-200'
            }`}
          >
            <div className="font-semibold uppercase tracking-wider text-[10px] opacity-80">{d.format('ddd')}</div>
            <div className="mt-0.5 tabular-nums text-sm font-medium">{d.format('D')}</div>
            {n > 0 ? (
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                {n} appt{n === 1 ? '' : 's'}
              </div>
            ) : (
              <div className="mt-1 h-3" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isSalonDesk = user?.role === 'admin' || user?.role === 'staff';
  const [deskFilter, setDeskFilter] = useState<DeskFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [weekAnchor, setWeekAnchor] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [exporting, setExporting] = useState(false);

  const { data: rows = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const res = await listAppointments();
      return (res.data.data || []) as AppointmentRow[];
    },
  });

  const error = queryError ? getApiErrorMessage(queryError, 'Could not load appointments.') : '';

  const ownRows = useMemo(() => {
    if (user?.role !== 'customer' || !user?.id) return rows;
    return rows.filter((r) => r.userId === user.id);
  }, [rows, user?.role, user?.id]);

  const todayStr = dayjs().format('YYYY-MM-DD');

  const countsByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of ownRows) {
      if (a.status === 'cancelled') continue;
      m.set(a.appointmentDate, (m.get(a.appointmentDate) ?? 0) + 1);
    }
    return m;
  }, [ownRows]);

  const filteredRows = useMemo(() => {
    if (deskFilter === 'today') {
      return ownRows.filter((a) => a.appointmentDate === todayStr);
    }
    if (deskFilter === 'upcoming') {
      return ownRows.filter((a) => a.appointmentDate >= todayStr && a.status !== 'cancelled');
    }
    return ownRows;
  }, [ownRows, deskFilter, todayStr]);

  const setQuickStatus = async (id: string, status: AppointmentRow['status']) => {
    setUpdatingId(id);
    try {
      await updateAppointment(id, { status });
      await qc.invalidateQueries({ queryKey: ['appointments'] });
    } catch (err: unknown) {
      void refetch();
      alert(getApiErrorMessage(err, 'Could not update status.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await downloadAppointmentsCsv();
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appointments-${dayjs().format('YYYY-MM-DD-HHmm')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      alert(getApiErrorMessage(e, 'Export failed.'));
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <AuthGuard>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 border-b border-stone-300/50 pb-8 dark:border-stone-600/50 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
              Diary
            </p>
            <h1 className="font-display text-3xl text-stone-900 dark:text-stone-50 sm:text-4xl">Appointments</h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
              {isSalonDesk
                ? 'Salon schedule — pick a day, filter, export CSV, or update status from the row.'
                : 'Your visits — pick a day in the week strip, then edit or cancel from each booking.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isSalonDesk ? (
              <Button type="button" variant="secondary" loading={exporting} onClick={() => void handleExport()}>
                Export CSV
              </Button>
            ) : null}
            <Link to="/appointments/new" className="shrink-0">
              <Button>New booking</Button>
            </Link>
          </div>
        </header>

        <section className="surface-card space-y-3 rounded-lg p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
              Week at a glance <span className="font-normal normal-case text-stone-500 dark:text-stone-500">(counts)</span>
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="!px-2 !py-1 text-[10px]"
                onClick={() => {
                  const n = dayjs(weekAnchor).subtract(7, 'day').format('YYYY-MM-DD');
                  setWeekAnchor(n);
                  setSelectedDate(n);
                }}
              >
                Prev week
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="!px-2 !py-1 text-[10px]"
                onClick={() => {
                  const n = dayjs(weekAnchor).add(7, 'day').format('YYYY-MM-DD');
                  setWeekAnchor(n);
                  setSelectedDate(n);
                }}
              >
                Next week
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="!px-2 !py-1 text-[10px]"
                onClick={() => {
                  const t = dayjs().format('YYYY-MM-DD');
                  setWeekAnchor(t);
                  setSelectedDate(t);
                }}
              >
                Today
              </Button>
            </div>
          </div>
          <WeekStrip
            weekAnchor={weekAnchor}
            selectedDate={selectedDate}
            onSelect={(iso) => setSelectedDate(iso)}
            counts={countsByDate}
          />
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
            Show
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter appointments">
            <button
              type="button"
              onClick={() => setDeskFilter('all')}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 ${
                deskFilter === 'all'
                  ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                  : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500 dark:border-stone-600 dark:bg-stone-900/50 dark:text-stone-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setDeskFilter('upcoming')}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 ${
                deskFilter === 'upcoming'
                  ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                  : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500 dark:border-stone-600 dark:bg-stone-900/50 dark:text-stone-200'
              }`}
            >
              Upcoming
            </button>
            {isSalonDesk ? (
              <button
                type="button"
                onClick={() => setDeskFilter('today')}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 ${
                  deskFilter === 'today'
                    ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                    : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500 dark:border-stone-600 dark:bg-stone-900/50 dark:text-stone-200'
                }`}
              >
                Today
              </button>
            ) : null}
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="surface-card overflow-hidden rounded-lg">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  {Array.from({ length: isSalonDesk ? 8 : 7 }).map((_, i) => (
                    <th key={i} className="px-4 py-3">
                      <Skeleton className="h-3 w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/80 dark:divide-stone-700/80">
                {[0, 1, 2, 3, 4].map((i) => (
                  <TableRowSkeleton key={i} cols={isSalonDesk ? 8 : 7} />
                ))}
              </tbody>
            </table>
          </div>
        ) : ownRows.length === 0 ? (
          <div className="surface-muted rounded-lg border-stone-200/80 p-8 text-center dark:border-stone-700/80">
            <p className="text-sm font-medium text-stone-800 dark:text-stone-100">Nothing on the calendar yet</p>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
              When you add a booking, it will show up here. Start with &quot;New booking&quot; above.
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="surface-muted rounded-lg border-stone-200/80 p-8 text-center text-sm text-stone-600 dark:border-stone-700/80 dark:text-stone-300">
            No appointments match this filter. Try another tab.
          </div>
        ) : (
          <div className="surface-card max-h-[min(70vh,720px)] overflow-hidden rounded-lg">
            <div className="max-h-[min(70vh,720px)] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/95 text-left text-xs font-semibold uppercase tracking-[0.12em] text-stone-500 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95 dark:text-stone-400">
                  <tr>
                    <th className="px-4 py-3.5">{isSalonDesk ? 'Customer' : 'Your details'}</th>
                    <th className="px-4 py-3.5">Service</th>
                    {isSalonDesk ? <th className="px-4 py-3.5">Staff</th> : null}
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Time</th>
                    <th className="px-4 py-3.5">VIP</th>
                    <th className="px-4 py-3.5">Status</th>
                    {isSalonDesk ? <th className="min-w-[200px] px-4 py-3.5">Quick status</th> : null}
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/80 dark:divide-stone-700/80">
                  {filteredRows.map((a) => (
                    <tr
                      key={a.id}
                      className="bg-white/50 transition-colors duration-150 hover:bg-stone-50/80 dark:bg-stone-950/30 dark:hover:bg-stone-800/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-stone-900 dark:text-stone-100">{a.customerName}</div>
                        <div className="text-xs text-stone-500 dark:text-stone-400">{a.customerEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300">{a.service?.name ?? '—'}</td>
                      {isSalonDesk ? (
                        <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300">{a.assignedStaff?.name ?? '—'}</td>
                      ) : null}
                      <td className="px-4 py-3.5 tabular-nums text-stone-700 dark:text-stone-300">{a.appointmentDate}</td>
                      <td className="px-4 py-3.5 tabular-nums text-stone-700 dark:text-stone-300">{a.startTime}</td>
                      <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300">{a.isVip ? 'Yes' : '—'}</td>
                      <td className="px-4 py-3.5 capitalize text-stone-700 dark:text-stone-300">{a.status ?? 'pending'}</td>
                      {isSalonDesk ? (
                        <td className="px-4 py-3.5">
                          {a.status === 'cancelled' ? (
                            <span className="text-xs text-stone-500">Cancelled</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {(['pending', 'confirmed', 'completed'] as const).map((s) => (
                                <Button
                                  key={s}
                                  type="button"
                                  size="sm"
                                  variant={a.status === s ? undefined : 'secondary'}
                                  loading={updatingId === a.id}
                                  disabled={updatingId === a.id || a.status === s}
                                  className="!px-2 !py-1 text-[10px] uppercase tracking-wide"
                                  onClick={() => void setQuickStatus(a.id, s)}
                                >
                                  {s === 'pending' ? 'Queue' : s === 'confirmed' ? 'Confirm' : 'Done'}
                                </Button>
                              ))}
                            </div>
                          )}
                        </td>
                      ) : null}
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/appointments/${a.id}/edit`}
                          className="text-xs font-semibold uppercase tracking-wider text-stone-800 underline decoration-stone-300 underline-offset-4 transition hover:decoration-stone-700 dark:text-stone-200 dark:decoration-stone-600"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
