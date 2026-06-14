import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getAppointment,
  updateAppointment,
  cancelAppointment,
  getAvailableSlots,
  listStaffForAssignment,
} from '@/lib/api/appointments';
import AuthGuard from '@/components/layout/AuthGuard';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/utils/apiError';

// ─── Types ───

interface AppointmentFormData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  isVip: boolean;
  appointmentDate: string;
  startTime: string;
  assignedStaffId: string;
}

type Slot = { startTime: string; endTime: string; available: boolean };

// ─── Constants ───

const HOURS_BEFORE_RESCHEDULE = 48;
const HOURS_BEFORE_CUSTOMER_CANCEL = 24;

const APPT_STATUS_OPTIONS = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'] as const satisfies readonly AppointmentFormData['status'][];

function appointmentStatusLabel(s: AppointmentFormData['status']): string {
  if (s === 'no_show') return 'No-show';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Exports ───

export default function EditAppointmentPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const isCustomer = user?.role === 'customer';
  const needsSalonForStaffList = isCustomer || user?.role === 'super_admin';
  const canSetStatus = isAdmin || isStaff;
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [appointmentSalonId, setAppointmentSalonId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const { register, handleSubmit, reset, watch, control, setValue, formState: { isSubmitting } } =
    useForm<AppointmentFormData>({
      defaultValues: { isVip: false, appointmentDate: '', startTime: '', assignedStaffId: '' },
    });

  const resetRef = useRef(reset);
  useEffect(() => {
    resetRef.current = reset;
  });

  const appointmentDate = useWatch({ control, name: 'appointmentDate' });
  const startTime = useWatch({ control, name: 'startTime' });
  const assignedStaffWatch = useWatch({ control, name: 'assignedStaffId' });
  const statusWatch = watch('status') ?? 'pending';

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-assignees', appointmentSalonId, user?.role],
    queryFn: async () => {
      const res = await listStaffForAssignment(
        needsSalonForStaffList && appointmentSalonId
          ? { salonId: appointmentSalonId }
          : undefined,
      );
      return (res.data.data || []) as {
        id: string;
        name: string;
        email: string;
        role: string;
        speciality?: string | null;
      }[];
    },
    enabled: Boolean(id) && Boolean(user) && (!needsSalonForStaffList || Boolean(appointmentSalonId)),
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getAppointment(id)
      .then((res) => {
        const a = res.data.data as {
          customerName: string;
          customerEmail: string;
          customerPhone?: string;
          notes?: string;
          status: string;
          isVip?: boolean;
          appointmentDate: string;
          startTime: string;
          salonId?: string | null;
          service?: { id: string };
          assignedStaffId?: string | null;
        };
        setAppointmentSalonId(a.salonId ? String(a.salonId) : null);
        setServiceId(a.service?.id || '');
        resetRef.current({
          customerName: a.customerName,
          customerEmail: a.customerEmail,
          customerPhone: a.customerPhone || '',
          notes: a.notes || '',
          status: (a.status as AppointmentFormData['status']) || 'pending',
          isVip: Boolean(a.isVip),
          appointmentDate: a.appointmentDate,
          startTime: a.startTime,
          assignedStaffId: a.assignedStaffId || '',
        });
      })
      .catch((err: unknown) => setServerError(getApiErrorMessage(err, 'Could not load appointment')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!serviceId || !appointmentDate) return;
    let cancelled = false;
    setLoadingSlots(true);
    getAvailableSlots(serviceId, appointmentDate, {
      staffId: assignedStaffWatch?.trim() || undefined,
      salonId: isCustomer ? appointmentSalonId ?? undefined : undefined,
    })
      .then((res) => {
        if (!cancelled) setSlots(res.data.data.slots || []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId, appointmentDate, assignedStaffWatch, isCustomer, appointmentSalonId]);

  const hoursUntil = useMemo(() => {
    if (!appointmentDate || !startTime) return 0;
    return dayjs(`${appointmentDate} ${startTime}`).diff(dayjs(), 'hour', true);
  }, [appointmentDate, startTime]);

  const canCustomerReschedule =
    isCustomer && ['pending', 'confirmed'].includes(statusWatch) && hoursUntil >= HOURS_BEFORE_RESCHEDULE;
  const canCustomerCancel =
    isCustomer &&
    ['pending', 'confirmed'].includes(statusWatch) &&
    hoursUntil >= HOURS_BEFORE_CUSTOMER_CANCEL &&
    statusWatch !== 'cancelled';

  const onSubmit = async (data: AppointmentFormData) => {
    if (!id) return;
    setServerError('');
    try {
      const base = {
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        notes: data.notes,
        appointmentDate: data.appointmentDate,
        startTime: data.startTime,
      };
      let payload: Record<string, unknown> = {};
      if (isAdmin) {
        payload = {
          ...base,
          status: data.status,
          isVip: data.isVip,
          assignedStaffId: data.assignedStaffId || null,
        };
      } else if (canSetStatus) {
        payload = { ...base, status: data.status, assignedStaffId: data.assignedStaffId || null };
      } else {
        payload = { ...base };
      }
      await updateAppointment(id, payload);
      navigate('/appointments');
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, 'Update failed'));
    }
  };

  const onCancelBooking = async () => {
    if (!id) return;
    if (!window.confirm('Cancel this booking?')) return;
    setServerError('');
    try {
      await cancelAppointment(id);
      navigate('/appointments');
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, 'Could not cancel.'));
    }
  };

  if (!id) {
    return (
      <AuthGuard>
        <div className="page-shell-form py-16 text-center text-sm text-stone-600 dark:text-stone-400">
          That appointment link is not valid.
        </div>
      </AuthGuard>
    );
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex justify-center py-20" role="status" aria-label="Loading appointment">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-stone-600 dark:border-t-stone-200" aria-hidden />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="page-shell-form">
        <header className="page-header">
          <p className="page-eyebrow">
            Amend
          </p>
          <h1 className="page-title">Edit appointment</h1>
          {isStaff && !isAdmin ? (
            <p className="page-lede">
              You can update contact details, reschedule, assign staff, and move the workflow. VIP is admin-only.
            </p>
          ) : isCustomer ? (
            <p className="page-lede">
              Reschedule at least 48 hours before your visit; cancel at least 24 hours ahead, or call the salon.
            </p>
          ) : null}
        </header>

        {serverError && (
          <div className="rounded-md border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="surface-card space-y-6 rounded-lg p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Customer name" {...register('customerName')} />
            <Input label="Customer email" type="email" {...register('customerEmail')} />
          </div>
          <Input label="Phone" type="tel" {...register('customerPhone')} />

          {isCustomer && !canCustomerReschedule && ['pending', 'confirmed'].includes(statusWatch) ? (
            <div className="rounded-md border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm dark:border-stone-700 dark:bg-stone-900/50">
              <p className="page-eyebrow">
                Your visit
              </p>
              <p className="mt-1 text-stone-900 dark:text-stone-100">
                {appointmentDate} at {startTime}
              </p>
              <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
                Changes within 48 hours need a quick call to the salon.
              </p>
            </div>
          ) : null}

          {(isAdmin || isStaff || (isCustomer && canCustomerReschedule)) && (
            <div className="space-y-3 rounded-md border border-stone-200 bg-stone-50/60 p-4 dark:border-stone-700 dark:bg-stone-900/40">
              <p className="page-eyebrow">
                Schedule
              </p>
              <Input
                label="Appointment date"
                type="date"
                min={isCustomer ? dayjs().format('YYYY-MM-DD') : undefined}
                {...register('appointmentDate')}
              />
              {loadingSlots ? (
                <p className="text-xs text-stone-500">Loading slots…</p>
              ) : (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Start time">
                  {slots.map((slot) => (
                    <button
                      key={slot.startTime}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setValue('startTime', slot.startTime)}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                        startTime === slot.startTime
                          ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                          : slot.available
                            ? 'border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900'
                            : 'cursor-not-allowed border-stone-200 text-stone-400 line-through dark:border-stone-800'
                      }`}
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              )}
              {isCustomer && !canCustomerReschedule && ['pending', 'confirmed'].includes(statusWatch) ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Online reschedule closes 48 hours before the visit — please call the salon for short-notice changes.
                </p>
              ) : null}
            </div>
          )}

          {(isAdmin || isStaff) && staffList.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="assigned-staff" className="section-label">
                Assigned staff
              </label>
              <select
                id="assigned-staff"
                className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
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

          {isAdmin ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="appt-status" className="section-label">
                  Status
                </label>
                <select
                  id="appt-status"
                  className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                  {...register('status')}
                >
                  {APPT_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {appointmentStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-amber-200/90 bg-amber-50/50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900"
                  {...register('isVip', { setValueAs: (v) => v === true || v === 'on' })}
                />
                <span>
                  <span className="text-sm font-medium text-stone-900 dark:text-stone-100">VIP booking</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                    Should reflect what the client booked; VIP templates depend on it.
                  </span>
                </span>
              </label>
            </>
          ) : canSetStatus ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="appt-status-staff" className="section-label">
                Status
              </label>
              <select
                id="appt-status-staff"
                className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                {...register('status')}
              >
                {APPT_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {appointmentStatusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-md border border-stone-200 bg-stone-50/80 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/50">
              <p className="page-eyebrow">
                Salon status
              </p>
              <p className="mt-1 text-sm font-medium text-stone-900 dark:text-stone-100">
                {appointmentStatusLabel(statusWatch as AppointmentFormData['status'])}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="appt-notes" className="section-label">
              Notes
            </label>
            <textarea
              id="appt-notes"
              rows={3}
              className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
              {...register('notes')}
            />
          </div>

          <div className="flex flex-wrap gap-3 border-t border-stone-200/80 pt-6 dark:border-stone-700/80">
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
            {isCustomer && canCustomerCancel ? (
              <Button type="button" variant="danger" onClick={() => void onCancelBooking()}>
                Cancel booking
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}
