'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listServices } from '@/lib/api/services';
import { getAvailableSlots, createAppointment, listStaffForAssignment } from '@/lib/api/appointments';
import { listMarketplaceSalons, type MarketplaceSalonCard } from '@/lib/api/marketplace';
import AuthGuard from '@/components/layout/AuthGuard';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { formatCurrency } from '@/lib/utils/currency';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

// ─── Constants ───

const BOOKING_FORM_SCHEMA = z.object({
  serviceId: z.string().min(1, 'Select a service'),
  customerName: z.string().min(2, 'Name is required'),
  customerEmail: z.string().email('Valid email required'),
  customerPhone: z.string().optional(),
  appointmentDate: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Select a time slot'),
  notes: z.string().optional(),
  isVip: z.boolean().optional(),
  emailRemindersOptIn: z.boolean().optional(),
  assignedStaffId: z.string().optional(),
  repeatNextWeek: z.boolean().optional(),
});

// ─── Types ───

type FormData = z.infer<typeof BOOKING_FORM_SCHEMA>;
type Service = { id: string; name: string; duration: number; price: number };
type Slot = { startTime: string; endTime: string; available: boolean };

// ─── Components ───

function CustomerSalonPicker() {
  const [serviceNeed, setServiceNeed] = useState('');
  const [discoverSalons, setDiscoverSalons] = useState<MarketplaceSalonCard[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const findSalons = async () => {
    setHasSearched(true);
    setDiscoverLoading(true);
    setDiscoverError('');
    try {
      const res = await listMarketplaceSalons({
        serviceQ: serviceNeed.trim() || undefined,
        sort: 'rating',
        limit: 24,
        offset: 0,
      });
      setDiscoverSalons(res.data.data?.salons || []);
    } catch (err: unknown) {
      setDiscoverError(getApiErrorMessage(err, 'Could not search salons.'));
      setDiscoverSalons([]);
    } finally {
      setDiscoverLoading(false);
    }
  };

  return (
    <div className="page-shell-form">
      <header className="page-header">
        <p className="page-eyebrow">Booking</p>
        <h1 className="page-title">Choose a salon first</h1>
        <p className="page-lede">
          Appointments are always tied to a specific salon. Browse the marketplace, open a profile, or search below for
          salons that offer the service you need — then continue to pick a time.
        </p>
      </header>

      <div className="surface-card space-y-6 rounded-lg p-6 sm:p-8">
        <div className="flex flex-wrap gap-3">
          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center rounded-md border border-stone-900 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 focus-ring dark:bg-stone-100 dark:text-stone-900 dark:border-stone-300 dark:hover:bg-white"
          >
            Browse all salons
          </Link>
        </div>

        <div className="border-t border-stone-200 pt-6 dark:border-stone-700">
          <p className="section-label">Or find salons by service</p>
          <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
            We match your text against live bookable services (for example &quot;cut&quot;, &quot;color&quot;,
            &quot;beard&quot;). Leave blank to see highly rated salons first.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label="Service keywords"
                value={serviceNeed}
                onChange={(e) => setServiceNeed(e.target.value)}
                placeholder="e.g. haircut, highlights, manicure"
              />
            </div>
            <Button type="button" onClick={() => void findSalons()} loading={discoverLoading}>
              Search salons
            </Button>
          </div>
          {discoverError ? (
            <p className="mt-3 text-sm text-red-800" role="alert">
              {discoverError}
            </p>
          ) : null}
        </div>

        {discoverSalons.length > 0 ? (
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 dark:divide-stone-700 dark:border-stone-700">
            {discoverSalons.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-stone-900 dark:text-stone-100">{s.name}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {[s.city, s.region].filter(Boolean).join(', ')}
                    {s.avgRating != null ? ` · ${s.avgRating.toFixed(1)} ★` : ''}
                    {s.reviewCount != null && s.reviewCount > 0 ? ` · ${s.reviewCount} reviews` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.slug ? (
                    <Link
                      to={`/marketplace/${encodeURIComponent(s.slug)}`}
                      className="inline-flex items-center rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-ring dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800/80"
                    >
                      View profile
                    </Link>
                  ) : null}
                  <Link
                    to={`/appointments/new?salonId=${encodeURIComponent(s.id)}`}
                    className="inline-flex items-center rounded-md border border-stone-900 bg-stone-900 px-3 py-2 text-sm font-semibold text-stone-50 hover:bg-stone-800 focus-ring dark:bg-stone-100 dark:text-stone-900 dark:border-stone-300 dark:hover:bg-white"
                  >
                    Book here
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {hasSearched && !discoverLoading && discoverSalons.length === 0 && !discoverError ? (
          <p className="text-sm text-stone-600 dark:text-stone-400">
            No salons matched that search. Try different keywords, browse the marketplace for filters, or pick a
            profile to see exact services.
          </p>
        ) : null}

        {!hasSearched ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Tip: use the marketplace to sort by price, rating, and popularity before you book.
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ─── Exports ───

export default function NewAppointmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isSalonDesk = user?.role === 'admin' || user?.role === 'staff';
  const salonIdFromUrl = searchParams.get('salonId')?.trim() || '';
  const bookingSalonId = isSalonDesk ? null : salonIdFromUrl || null;
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(BOOKING_FORM_SCHEMA),
    defaultValues: { isVip: false, emailRemindersOptIn: true, repeatNextWeek: false, assignedStaffId: '' },
  });

  const setValueRef = useRef(setValue);
  useEffect(() => {
    setValueRef.current = setValue;
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-assignees', isSalonDesk ? 'desk' : bookingSalonId],
    queryFn: async () => {
      const res = await listStaffForAssignment(
        isSalonDesk ? undefined : { salonId: bookingSalonId ?? undefined },
      );
      return (res.data.data || []) as { id: string; name: string; role: string; speciality?: string | null }[];
    },
    enabled: Boolean(user) && (isSalonDesk || Boolean(bookingSalonId)),
  });

  const selectedServiceId = useWatch({ control, name: 'serviceId' });
  const selectedDate = useWatch({ control, name: 'appointmentDate' });
  const selectedStartTime = useWatch({ control, name: 'startTime' });
  const selectedStaffId = useWatch({ control, name: 'assignedStaffId' });

  useEffect(() => {
    let cancelled = false;
    listServices(isSalonDesk ? undefined : bookingSalonId ?? undefined)
      .then((res) => {
        if (!cancelled) setServices(res.data.data || []);
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSalonDesk, bookingSalonId]);

  useEffect(() => {
    if (!selectedServiceId || !selectedDate) return;

    let isCancelled = false;
    void Promise.resolve().then(async () => {
      setLoadingSlots(true);
      setValueRef.current('startTime', '');
      try {
        const staffId = selectedStaffId?.trim() || undefined;
        const res = await getAvailableSlots(selectedServiceId, selectedDate, {
          staffId,
          salonId: isSalonDesk ? undefined : bookingSalonId ?? undefined,
        });
        if (!isCancelled) {
          setSlots(res.data.data.slots);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setSlots([]);
          setServerError(getApiErrorMessage(err, 'Could not load time slots.'));
        }
      } finally {
        if (!isCancelled) {
          setLoadingSlots(false);
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedServiceId, selectedDate, selectedStaffId, isSalonDesk, bookingSalonId]);

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      const staff = data.assignedStaffId?.trim() || undefined;
      const res = await createAppointment({
        serviceId: data.serviceId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        appointmentDate: data.appointmentDate,
        startTime: data.startTime,
        notes: data.notes,
        isVip: data.isVip,
        emailRemindersOptIn: data.emailRemindersOptIn,
        assignedStaffId: staff,
      });
      const created = res.data.data as { id?: string } | undefined;
      const firstId = created?.id;

      if (data.repeatNextWeek && firstId) {
        const nextDate = dayjs(data.appointmentDate).add(7, 'day').format('YYYY-MM-DD');
        const slotRes = await getAvailableSlots(data.serviceId, nextDate, {
          staffId: staff,
          salonId: isSalonDesk ? undefined : bookingSalonId ?? undefined,
        });
        const nextSlots = slotRes.data.data.slots as Slot[];
        const ok = nextSlots.some((s) => s.startTime === data.startTime && s.available);
        if (!ok) {
          setServerError(
            'Created the first visit, but the same time next week is not available. Open the appointment list to adjust.'
          );
          navigate(`/appointments/confirmation/${firstId}`);
          return;
        }
        await createAppointment({
          serviceId: data.serviceId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          appointmentDate: nextDate,
          startTime: data.startTime,
          notes: data.notes,
          isVip: data.isVip,
          emailRemindersOptIn: data.emailRemindersOptIn,
          assignedStaffId: staff,
          seriesId: firstId,
        });
      }

      if (firstId) {
        navigate(`/appointments/confirmation/${firstId}`);
      } else {
        navigate('/appointments');
      }
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, 'Failed to create appointment'));
    }
  };

  const today = dayjs().format('YYYY-MM-DD');

  if (!isSalonDesk && !bookingSalonId) {
    return (
      <AuthGuard>
        <CustomerSalonPicker />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="page-shell-form">
        <header className="page-header">
          <p className="page-eyebrow">Booking</p>
          <h1 className="page-title">New appointment</h1>
          <p className="page-lede">
            Service, slot, contact — keep it accurate. After you confirm, you&apos;ll see a summary and next steps.
            {!isSalonDesk && bookingSalonId ? (
              <>
                {' '}
                <Link to="/marketplace" className="font-medium text-rose-800 underline dark:text-rose-300">
                  Change salon
                </Link>
              </>
            ) : null}
          </p>
        </header>

        {serverError && (
          <div
            className="rounded-md border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900"
            role="alert"
            aria-live="polite"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="surface-card space-y-6 rounded-lg p-6 sm:p-8">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="booking-service" className="section-label">
              Service
            </label>
            <select
              id="booking-service"
              className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 transition focus-ring"
              disabled={servicesLoading}
              {...register('serviceId')}
            >
              <option value="">{servicesLoading ? 'Loading services…' : 'Select a service'}</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.duration} min — {formatCurrency(s.price)}
                </option>
              ))}
            </select>
            {errors.serviceId && <p className="text-xs text-red-500">{errors.serviceId.message}</p>}
            {!servicesLoading && services.length === 0 ? (
              <p className="text-sm text-stone-500">No services available. Please try again later.</p>
            ) : null}
          </div>

          <Input
            label="Appointment Date"
            type="date"
            min={today}
            error={errors.appointmentDate?.message}
            {...register('appointmentDate')}
          />

          {staffList.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-assigned-staff" className="section-label">
                {isSalonDesk ? 'Assigned staff (optional)' : 'Preferred stylist (optional)'}
              </label>
              <select
                id="new-assigned-staff"
                className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring"
                {...register('assignedStaffId')}
              >
                <option value="">— None —</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                    {s.speciality ? ` — ${s.speciality}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {selectedServiceId && selectedDate && (
            <div className="flex flex-col gap-2">
              <p className="section-label">Available slots</p>
              {loadingSlots ? (
                <div className="flex flex-wrap gap-2" role="status" aria-label="Loading slots">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-9 w-20 animate-pulse rounded-md bg-stone-200/80" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-stone-500">No slots left for this date.</p>
              ) : (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a start time">
                  {slots.map((slot) => (
                    <button
                      key={slot.startTime}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setValue('startTime', slot.startTime)}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                        selectedStartTime === slot.startTime
                          ? 'border-stone-900 bg-stone-900 text-stone-50'
                          : slot.available
                            ? 'border-stone-300 bg-white text-stone-800 hover:border-stone-500'
                            : 'cursor-not-allowed border-stone-200 bg-stone-100/80 text-stone-400 line-through'
                      }`}
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              )}
              {errors.startTime && <p className="text-xs text-red-500">{errors.startTime.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Customer Name"
              placeholder="Jane Doe"
              error={errors.customerName?.message}
              {...register('customerName')}
            />
            <Input
              label="Customer Email"
              type="email"
              placeholder="jane@example.com"
              error={errors.customerEmail?.message}
              {...register('customerEmail')}
            />
            {isSalonDesk ? (
              <p className="sm:col-span-2 text-xs text-stone-500 dark:text-stone-400">
                If this email matches a registered customer account, the visit is saved to their dashboard. Walk-ins
                with no account stay on the salon calendar only.
              </p>
            ) : null}
          </div>

          <Input label="Phone (optional)" type="tel" placeholder="+1 555 000 0000" {...register('customerPhone')} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="booking-notes" className="section-label">
              Notes (optional)
            </label>
            <textarea
              id="booking-notes"
              rows={3}
              placeholder="Allergies, parking, preferred stylist…"
              className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus-ring"
              {...register('notes')}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-stone-200 bg-stone-50/60 px-4 py-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-800/20"
              {...register('emailRemindersOptIn', { setValueAs: (v) => v === true || v === 'on' })}
            />
            <span>
              <span className="text-sm font-medium text-stone-900">Email reminders</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-stone-600">
                When left on, we aim to send about <strong className="font-medium text-stone-800">24 hours</strong> and{' '}
                <strong className="font-medium text-stone-800">2 hours</strong> before your visit (exact timing may
                vary). You can turn this off anytime before confirming.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-stone-200 bg-stone-50/60 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/40">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-800/20"
              {...register('repeatNextWeek', { setValueAs: (v) => v === true || v === 'on' })}
            />
            <span>
              <span className="text-sm font-medium text-stone-900 dark:text-stone-100">Repeat same time next week</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                Books a second visit seven days later when that slot is still free.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-amber-200/90 bg-amber-50/50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/25">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-800/20"
              {...register('isVip', { setValueAs: (v) => v === true || v === 'on' })}
            />
            <span>
              <span className="text-sm font-medium text-stone-900">VIP visit</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-stone-600">
                Choose before confirming. Needed for VIP templates and some bulk sends.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-3 border-t border-stone-200/80 pt-6">
            <Button type="submit" loading={isSubmitting}>
              Confirm booking
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}
