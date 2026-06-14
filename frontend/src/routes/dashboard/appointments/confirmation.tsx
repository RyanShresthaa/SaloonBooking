import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAppointment, cancelAppointment } from '@/lib/api/appointments';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { Calendar, Mail, Scissors, User } from 'lucide-react';

interface AppointmentDetail {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  isVip?: boolean;
  emailRemindersOptIn?: boolean;
  notes?: string | null;
  service?: { name?: string; duration?: number; price?: number };
}

export default function AppointmentConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appt, setAppt] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) {
      queueMicrotask(() => {
        setLoading(false);
      });
      return;
    }
    let cancelled = false;
    getAppointment(id)
      .then((res) => {
        if (!cancelled) setAppt(res.data.data as AppointmentDetail);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load this booking.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCancel = async () => {
    if (!id || !window.confirm('Cancel this appointment? This cannot be undone from here.')) return;
    setCancelling(true);
    setError('');
    try {
      await cancelAppointment(id);
      navigate('/appointments', { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not cancel.'));
    } finally {
      setCancelling(false);
    }
  };

  if (!id) {
    return (
      <AuthGuard>
        <div className="page-shell-form">
          <p className="py-16 text-center text-sm text-stone-600 dark:text-stone-400">Missing booking reference.</p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="page-shell-form">
        <header className="page-header">
          <p className="page-eyebrow">Booking</p>
          <h1 className="page-title">You&apos;re booked</h1>
          <p className="page-lede">
            Here is what we saved. You can review details anytime under Appointments.
          </p>
        </header>

        {error ? (
          <div
            className="rounded-md border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16" role="status" aria-label="Loading booking">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" aria-hidden />
          </div>
        ) : !appt ? (
          <p className="text-sm text-stone-600">We could not find that appointment.</p>
        ) : (
          <>
            <div className="surface-card space-y-5 rounded-lg p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <Scissors className="mt-0.5 h-5 w-5 shrink-0 text-stone-500" strokeWidth={1.5} aria-hidden />
                <div>
                  <p className="section-label">Service</p>
                  <p className="text-lg font-medium text-stone-900">{appt.service?.name ?? 'Service'}</p>
                  {appt.service?.duration != null ? (
                    <p className="text-xs text-stone-500">{appt.service.duration} minutes</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-stone-500" strokeWidth={1.5} aria-hidden />
                <div>
                  <p className="section-label">When</p>
                  <p className="text-lg font-medium text-stone-900">
                    {appt.appointmentDate} at {appt.startTime}
                  </p>
                  <p className="text-xs capitalize text-stone-500">Status: {appt.status}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-5 w-5 shrink-0 text-stone-500" strokeWidth={1.5} aria-hidden />
                <div>
                  <p className="section-label">Guest</p>
                  <p className="font-medium text-stone-900">{appt.customerName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-stone-500" strokeWidth={1.5} aria-hidden />
                <div>
                  <p className="section-label">Contact</p>
                  <p className="text-stone-900">{appt.customerEmail}</p>
                  {appt.customerPhone ? <p className="text-sm text-stone-600">{appt.customerPhone}</p> : null}
                </div>
              </div>
              {appt.isVip ? (
                <p className="rounded-md border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs text-amber-950">
                  VIP visit — thank you; we&apos;ll prioritise your slot and extras where advertised.
                </p>
              ) : null}
              <p className="text-xs leading-relaxed text-stone-600">
                Reminder emails:{' '}
                {appt.emailRemindersOptIn === false
                  ? 'You opted out at booking time. You can contact the salon if you change your mind.'
                  : 'If you left reminders on when booking, we aim to email about 24 hours and about 2 hours before your visit (timing may vary).'}
              </p>
              {appt.status === 'pending' || appt.status === 'confirmed' ? (
                <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-500">
                  Online cancellation may require advance notice (often 24 hours in production). If the button fails, the
                  server message explains why — you can still phone or email the salon.
                </p>
              ) : null}
            </div>

            <section className="surface-muted rounded-lg border-stone-300/80 p-5 sm:p-6" aria-labelledby="next-heading">
              <h2 id="next-heading" className="font-display text-lg text-stone-900">
                What happens next
              </h2>
              <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-stone-700">
                <li>The salon may confirm or adjust your time if needed — watch your inbox.</li>
                <li>
                  Need to change details or cancel? Use the buttons below. Same-day changes may follow the salon&apos;s
                  policy.
                </li>
                <li>Questions? Reply to any salon email or call using the contact on your confirmation.</li>
              </ul>
            </section>

            <div className="flex flex-wrap gap-3">
              <Link to="/appointments">
                <Button variant="secondary">All appointments</Button>
              </Link>
              <Link to={`/appointments/${appt.id}/edit`}>
                <Button>Change details</Button>
              </Link>
              {appt.status !== 'cancelled' ? (
                <Button type="button" variant="secondary" loading={cancelling} onClick={() => void handleCancel()}>
                  Cancel booking
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
