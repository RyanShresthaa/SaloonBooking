import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
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

// ─── Constants ───

const WEEK_DAY_COUNT = 7;
const TABLE_SKELETON_ROW_KEYS = [0, 1, 2, 3, 4] as const;

// ─── Types ───

interface AppointmentRow {
  id: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  appointmentDate: string;
  startTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  isVip?: boolean;
  service?: { name?: string };
  assignedStaff?: { name?: string };
}

type DeskFilter = 'all' | 'today' | 'upcoming';
type StatusFilter = 'all' | AppointmentRow['status'];

function formatAppointmentStatus(status: string | undefined): string {
  const s = status ?? 'pending';
  if (s === 'no_show') return 'No-show';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Components ───

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
  const days = Array.from({ length: WEEK_DAY_COUNT }, (_, i) => start.add(i, 'day'));
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
            className={`min-w-[4.25rem] rounded-[var(--radius-card)] border px-2 py-2 text-center text-xs transition-colors duration-150 ${
              sel
                ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                : 'border-stone-200/90 bg-[#fffefb]/95 text-stone-700 hover:border-stone-400 dark:border-stone-600 dark:bg-stone-900/45 dark:text-stone-200'
            }`}
          >
            <div className="font-medium text-[10px] text-stone-500 opacity-90 dark:text-stone-400">{d.format('ddd')}</div>
            <div className="mt-0.5 tabular-nums text-sm font-medium">{d.format('D')}</div>
            {n > 0 ? (
              <div className="mt-1 text-[10px] font-medium text-stone-500 dark:text-stone-400">
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

// ─── Exports ───

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isSalonDesk = user?.role === 'admin' || user?.role === 'staff';
  const [deskFilter, setDeskFilter] = useState<DeskFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [weekAnchor, setWeekAnchor] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [limitToSelectedDay, setLimitToSelectedDay] = useState(false);

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
  }, [rows, user]);

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
    let list = ownRows;
    if (limitToSelectedDay) {
      list = list.filter((a) => a.appointmentDate === selectedDate);
    }
    if (deskFilter === 'today') {
      list = list.filter((a) => a.appointmentDate === todayStr);
    } else if (deskFilter === 'upcoming') {
      list = list.filter((a) => a.appointmentDate >= todayStr && a.status !== 'cancelled');
    }
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => {
        const staff = (a.assignedStaff?.name ?? '').toLowerCase();
        return (
          a.customerName.toLowerCase().includes(q) ||
          a.customerEmail.toLowerCase().includes(q) ||
          (a.service?.name ?? '').toLowerCase().includes(q) ||
          (isSalonDesk && staff.includes(q))
        );
      });
    }
    return [...list].sort((a, b) => {
      const byDate = a.appointmentDate.localeCompare(b.appointmentDate);
      if (byDate !== 0) return byDate;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [ownRows, deskFilter, todayStr, search, statusFilter, limitToSelectedDay, selectedDate, isSalonDesk]);

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
      <div className="page-shell">
        <header className="page-header-row">
          <div>
            <p className="page-eyebrow">Diary</p>
            <h1 className="page-title">Appointments</h1>
            <p className="page-lede">
              {isSalonDesk
                ? 'Salon schedule — week strip, search, status filters, optional day-only view, CSV export, and quick status from each row.'
                : 'Your visits — search, filter by status, optionally match the selected day in the strip, then edit or cancel each booking.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isSalonDesk ? (
              <Button type="button" variant="secondary" loading={exporting} onClick={() => void handleExport()}>
                Export CSV
              </Button>
            ) : null}
            <Link to={isSalonDesk ? '/appointments/new' : '/marketplace'} className="shrink-0">
              <Button>{isSalonDesk ? 'New booking' : 'Find a salon'}</Button>
            </Link>
          </div>
        </header>

        <section className="surface-card space-y-3 rounded-lg p-4 sm:p-5" aria-label="Week at a glance">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="section-label">
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
          <span className="text-xs font-medium text-stone-600 dark:text-stone-400 pr-1">
            Show
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter appointments">
            <button
              type="button"
              onClick={() => setDeskFilter('all')}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium tracking-normal transition-colors duration-150 ${
                deskFilter === 'all'
                  ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                  : 'border-stone-300 bg-[#fffefb] text-stone-700 hover:border-stone-500 dark:border-stone-600 dark:bg-stone-900/50 dark:text-stone-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setDeskFilter('upcoming')}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium tracking-normal transition-colors duration-150 ${
                deskFilter === 'upcoming'
                  ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                  : 'border-stone-300 bg-[#fffefb] text-stone-700 hover:border-stone-500 dark:border-stone-600 dark:bg-stone-900/50 dark:text-stone-200'
              }`}
            >
              Upcoming
            </button>
            {isSalonDesk ? (
              <button
                type="button"
                onClick={() => setDeskFilter('today')}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium tracking-normal transition-colors duration-150 ${
                  deskFilter === 'today'
                    ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                    : 'border-stone-300 bg-[#fffefb] text-stone-700 hover:border-stone-500 dark:border-stone-600 dark:bg-stone-900/50 dark:text-stone-200'
                }`}
              >
                Today
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-stone-200/80 bg-[#faf7f2]/80 p-4 dark:border-stone-700/80 dark:bg-stone-900/35 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="relative min-w-[min(100%,18rem)] flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isSalonDesk ? 'Search name, email, service, staff…' : 'Search name, email, service…'}
              className="w-full rounded-md border border-stone-300 bg-[#fffefb] py-2.5 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500"
              aria-label="Filter appointments"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-stone-300 text-stone-900 dark:border-stone-600"
              checked={limitToSelectedDay}
              onChange={(e) => setLimitToSelectedDay(e.target.checked)}
            />
            Only {dayjs(selectedDate).format('ddd D MMM')}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-600 dark:text-stone-400 pr-1">Status</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {(['all', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium tracking-normal transition-colors duration-150 ${
                  statusFilter === s
                    ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                    : 'border-stone-300 bg-[#fffefb] text-stone-700 hover:border-stone-500 dark:border-stone-600 dark:bg-stone-900/50 dark:text-stone-200'
                }`}
              >
                {s === 'all' ? 'All statuses' : s === 'no_show' ? 'No-show' : s}
              </button>
            ))}
          </div>
        </div>

        {!loading && ownRows.length > 0 ? (
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Showing <span className="font-semibold tabular-nums text-stone-800 dark:text-stone-200">{filteredRows.length}</span> of{' '}
            <span className="tabular-nums">{ownRows.length}</span> in view
          </p>
        ) : null}

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
                {TABLE_SKELETON_ROW_KEYS.map((i) => (
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
          <div className="surface-card max-h-[min(70vh,720px)] overflow-hidden rounded-lg" aria-label="Appointments table">
            <div className="max-h-[min(70vh,720px)] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="data-table-head data-table-head--sticky">
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
                      className="bg-[#fdfcfa]/70 transition-colors duration-150 hover:bg-[#f0ebe3]/95 dark:bg-stone-950/25 dark:hover:bg-stone-800/45"
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
                      <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300">{formatAppointmentStatus(a.status)}</td>
                      {isSalonDesk ? (
                        <td className="px-4 py-3.5">
                          {a.status === 'cancelled' ? (
                            <span className="text-xs text-stone-500">Cancelled</span>
                          ) : a.status === 'no_show' ? (
                            <span className="text-xs text-stone-500">No-show</span>
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
                                  className="!px-2 !py-1 text-[10px] font-medium tracking-wide"
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
                          className="text-xs font-medium text-stone-800 underline decoration-stone-400 underline-offset-[3px] transition hover:decoration-stone-600 dark:text-stone-200 dark:decoration-stone-500"
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
