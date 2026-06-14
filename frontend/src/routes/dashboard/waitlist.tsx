import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { listServices } from '@/lib/api/services';
import { listWaitlist, createWaitlistEntry, updateWaitlistStatus } from '@/lib/api/waitlist';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { LEGACY_DEFAULT_SALON_ID } from '@/lib/constants/salon';

// ─── Types ───

type Service = { id: string; name: string };
type Row = {
  id: string;
  status: string;
  preferredDate?: string | null;
  phone?: string | null;
  notes?: string | null;
  service?: { name?: string };
  user?: { name?: string; email?: string };
};

// ─── Constants ───

const STATUS_TABS = ['all', 'pending', 'contacted', 'fulfilled', 'cancelled'] as const;
const STAFF_STATUS_ACTIONS = ['contacted', 'fulfilled', 'cancelled'] as const;

// ─── Exports ───

export default function WaitlistPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isSalonWide = user?.role === 'admin' || user?.role === 'staff';
  const customerSalonId = searchParams.get('salonId')?.trim() || LEGACY_DEFAULT_SALON_ID;
  const [services, setServices] = useState<Service[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    listWaitlist()
      .then((res) => setRows(res.data.data || []))
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Could not load waitlist.')));
  }, []);

  useEffect(() => {
    let cancelled = false;
    listServices(isSalonWide ? undefined : customerSalonId).then((res) => {
      if (!cancelled) setServices(res.data.data || []);
    });
    listWaitlist()
      .then((res) => {
        if (!cancelled) setRows(res.data.data || []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load waitlist.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSalonWide, customerSalonId]);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{
    serviceId: string;
    preferredDate: string;
    phone: string;
    notes: string;
  }>({ defaultValues: { serviceId: '', preferredDate: '', phone: '', notes: '' } });

  const onCreate = async (data: { serviceId: string; preferredDate: string; phone: string; notes: string }) => {
    setError('');
    try {
      await createWaitlistEntry({
        serviceId: data.serviceId,
        preferredDate: data.preferredDate || undefined,
        phone: data.phone || undefined,
        notes: data.notes || undefined,
      });
      reset();
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not join waitlist.'));
    }
  };

  const setStatus = async (id: string, status: string) => {
    setError('');
    try {
      await updateWaitlistStatus(id, status);
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not update.'));
    }
  };

  const visibleRows = useMemo(() => {
    let list = rows;
    if (statusTab !== 'all') {
      list = list.filter((r) => r.status === statusTab);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const guest = `${r.user?.name ?? ''} ${r.user?.email ?? ''}`.toLowerCase();
        const svc = (r.service?.name ?? '').toLowerCase();
        const notes = (r.notes ?? '').toLowerCase();
        return guest.includes(q) || svc.includes(q) || notes.includes(q);
      });
    }
    return list;
  }, [rows, statusTab, search]);

  return (
    <AuthGuard>
      <div className="page-shell-spacious">
        <header className="page-header">
          <p className="page-eyebrow">Demand</p>
          <h1 className="page-title">Waitlist</h1>
          <p className="page-lede">
            Request a callback when your preferred service opens up. The salon team updates status as they reach out.
          </p>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900">{error}</div>
        ) : null}

        <section className="surface-card rounded-lg p-6 sm:p-8" aria-label="Join waitlist">
          <h2 className="font-display text-xl text-stone-900">Join the list</h2>
          <form onSubmit={handleSubmit(onCreate)} className="mt-6 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="section-label">Service</label>
              <select
                className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring"
                {...register('serviceId', { required: true })}
              >
                <option value="">Select…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Preferred date (optional)" type="date" {...register('preferredDate')} />
            <Input label="Phone (optional)" type="tel" {...register('phone')} />
            <div className="flex flex-col gap-1.5">
              <label className="section-label">Notes</label>
              <textarea rows={2} className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus-ring" {...register('notes')} />
            </div>
            <Button type="submit" loading={isSubmitting}>
              Submit request
            </Button>
          </form>
        </section>

        <section aria-label="Waitlist entries">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <h2 className="font-display text-xl text-stone-900">Entries</h2>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search guest, service, notes…"
                className="w-full rounded-md border border-stone-300 bg-[#fffefb] py-2 pl-9 pr-3 text-sm text-stone-900 focus-ring"
                aria-label="Search waitlist"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusTab(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  statusTab === s
                    ? 'border-stone-900 bg-stone-900 text-stone-50'
                    : 'border-stone-300 bg-[#fffefb] text-stone-700 hover:border-stone-500'
                }`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-stone-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="mt-4 text-sm text-stone-600">No waitlist rows yet.</p>
          ) : visibleRows.length === 0 ? (
            <p className="mt-4 rounded-lg border border-stone-200/80 bg-[#faf7f2] px-4 py-6 text-center text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-300">
              No entries match your search or status filter.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto surface-card rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="data-table-head data-table-head--sticky">
                  <tr>
                    {isSalonWide ? <th className="px-4 py-3">Guest</th> : null}
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Preferred</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/80">
                  {visibleRows.map((r) => (
                    <tr key={r.id} className="bg-[#f7f3ed]/80 dark:bg-stone-900/40">
                      {isSalonWide ? (
                        <td className="px-4 py-3">
                          <div className="font-medium text-stone-900">{r.user?.name}</div>
                          <div className="text-xs text-stone-500">{r.user?.email}</div>
                        </td>
                      ) : null}
                      <td className="px-4 py-3">{r.service?.name ?? '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{r.preferredDate ?? '—'}</td>
                      <td className="px-4 py-3 capitalize">{r.status}</td>
                      <td className="px-4 py-3">
                        {isSalonWide ? (
                          <div className="flex flex-wrap gap-1">
                            {STAFF_STATUS_ACTIONS.map((s) => (
                              <Button key={s} type="button" size="sm" variant="secondary" className="!px-2 !py-1 text-[10px]" onClick={() => void setStatus(r.id, s)}>
                                {s}
                              </Button>
                            ))}
                          </div>
                        ) : r.status === 'pending' ? (
                          <Button type="button" size="sm" variant="secondary" onClick={() => void setStatus(r.id, 'cancelled')}>
                            Cancel request
                          </Button>
                        ) : (
                          <span className="text-xs text-stone-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AuthGuard>
  );
}
