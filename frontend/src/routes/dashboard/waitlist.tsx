import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { listServices } from '@/lib/api/services';
import { listWaitlist, createWaitlistEntry, updateWaitlistStatus } from '@/lib/api/waitlist';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/utils/apiError';

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

export default function WaitlistPage() {
  const { user } = useAuthStore();
  const isSalonWide = user?.role === 'admin' || user?.role === 'staff';
  const [services, setServices] = useState<Service[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    listWaitlist()
      .then((res) => setRows(res.data.data || []))
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Could not load waitlist.')));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listServices().then((res) => {
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
  }, []);

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

  return (
    <AuthGuard>
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="border-b border-stone-300/50 pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Demand</p>
          <h1 className="font-display text-3xl text-stone-900 sm:text-4xl">Waitlist</h1>
          <p className="mt-2 text-sm text-stone-600">
            Request a callback when your preferred service opens up. The salon team updates status as they reach out.
          </p>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900">{error}</div>
        ) : null}

        <section className="surface-card rounded-lg p-6 sm:p-8">
          <h2 className="font-display text-xl text-stone-900">Join the list</h2>
          <form onSubmit={handleSubmit(onCreate)} className="mt-6 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Service</label>
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
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Notes</label>
              <textarea rows={2} className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus-ring" {...register('notes')} />
            </div>
            <Button type="submit" loading={isSubmitting}>
              Submit request
            </Button>
          </form>
        </section>

        <section>
          <h2 className="font-display text-xl text-stone-900">Entries</h2>
          {loading ? (
            <p className="mt-4 text-sm text-stone-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="mt-4 text-sm text-stone-600">No waitlist rows yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto surface-card rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="border-b border-stone-200 bg-stone-50/90 text-left text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">
                  <tr>
                    {isSalonWide ? <th className="px-4 py-3">Guest</th> : null}
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Preferred</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/80">
                  {rows.map((r) => (
                    <tr key={r.id} className="bg-white/40">
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
                            {(['contacted', 'fulfilled', 'cancelled'] as const).map((s) => (
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
