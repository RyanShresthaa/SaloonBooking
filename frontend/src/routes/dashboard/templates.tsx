import { useEffect, useState } from 'react';
import { listTemplates } from '@/lib/api/templates';
import { listAppointments } from '@/lib/api/appointments';
import { sendTemplateReminder } from '@/lib/api/notifications';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import { FileText, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/utils/apiError';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  requiresVip?: boolean;
}

interface AppointmentPreview {
  id: string;
  customerName: string;
  customerEmail: string;
  appointmentDate: string;
  startTime: string;
  isVip?: boolean;
  service?: { name?: string };
}

const fallbackPreviewData: Record<string, string> = {
  customerName: 'Valued Customer',
  serviceName: 'Salon Service',
  date: '2026-05-10',
  time: '10:30 AM',
};

const renderTemplatePreview = (templateBody: string, previewData: Record<string, string>) => {
  let previewBody = templateBody;
  Object.entries(previewData).forEach(([key, value]) => {
    previewBody = previewBody.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return previewBody;
};

export default function TemplatesPage() {
  const { user } = useAuthStore();
  const role = user?.role;
  const isAdmin = role === 'admin';
  const isCustomer = role === 'customer';

  const [templates, setTemplates] = useState<Template[]>([]);
  const [appointments, setAppointments] = useState<AppointmentPreview[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([listTemplates(), listAppointments()])
      .then(([templatesRes, appointmentsRes]) => {
        setTemplates(templatesRes.data.data || []);
        const appointmentList = appointmentsRes.data.data || [];
        setAppointments(appointmentList);
        if (appointmentList[0]?.id) {
          setSelectedAppointmentId(appointmentList[0].id);
        } else {
          setSelectedAppointmentId('');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedAppointment =
    appointments.find((appointment) => appointment.id === selectedAppointmentId) || null;

  const selectedTemplate = templates.find((t) => t.id === selected) || null;

  const vipTemplateLocked =
    Boolean(selectedTemplate?.requiresVip) && Boolean(selectedAppointment) && !selectedAppointment?.isVip;

  const previewData = selectedAppointment
    ? {
        customerName: selectedAppointment.customerName || fallbackPreviewData.customerName,
        serviceName: selectedAppointment.service?.name || fallbackPreviewData.serviceName,
        date: selectedAppointment.appointmentDate || fallbackPreviewData.date,
        time: selectedAppointment.startTime || fallbackPreviewData.time,
        vipExtra: selectedAppointment.isVip
          ? '<em style="color:#713f12;">VIP scheduling priority and complimentary refreshments.</em>'
          : '',
      }
    : { ...fallbackPreviewData, vipExtra: '' };

  const toggleTemplate = (templateId: string, requiresVip: boolean | undefined) => {
    if (requiresVip && selectedAppointment && !selectedAppointment.isVip) {
      return;
    }
    setSelected(templateId === selected ? null : templateId);
    setReminderMessage(null);
  };

  const handleSendReminder = async () => {
    if (!isAdmin || !selected || !selectedAppointmentId) return;
    const tpl = templates.find((t) => t.id === selected);
    if (tpl?.requiresVip && !selectedAppointment?.isVip) return;

    setSendingReminder(true);
    setReminderMessage(null);
    try {
      await sendTemplateReminder({
        appointmentId: selectedAppointmentId,
        templateId: selected,
      });
      setReminderMessage({ type: 'ok', text: 'Reminder email sent to the client.' });
    } catch (error: unknown) {
      setReminderMessage({ type: 'err', text: getApiErrorMessage(error, 'Could not send reminder.') });
    } finally {
      setSendingReminder(false);
    }
  };

  const appointmentOptionLabel = (appt: AppointmentPreview) => {
    if (isCustomer) {
      return `${appt.service?.name || 'Visit'} · ${appt.appointmentDate} ${appt.startTime}${appt.isVip ? ' · VIP' : ''}`;
    }
    return `${appt.customerName} (${appt.customerEmail}) — ${appt.service?.name || 'Service'}${appt.isVip ? ' [VIP]' : ''}`;
  };

  return (
    <AuthGuard>
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-2 border-b border-stone-300/50 pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {isCustomer ? 'Your account' : 'Correspondence'}
          </p>
          <h1 className="font-display text-3xl text-stone-900 sm:text-4xl">
            {isCustomer ? 'Email templates' : 'Templates'}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
            {isCustomer ? (
              <>
                See sample wording the salon might use. Previews use{' '}
                <strong className="font-medium text-stone-800">only your own bookings</strong> — you never see other
                guests&apos; appointments here.
              </>
            ) : (
              <>
                Preview with a salon booking, then send a single reminder (admins). VIP-only layouts stay locked until
                the appointment is flagged VIP.
              </>
            )}
          </p>
        </header>

        <div className="surface-card rounded-lg p-5 sm:p-6">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
            {isCustomer ? 'Your visit (preview)' : 'Preview appointment'}
          </label>
          {isCustomer && appointments.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              You don&apos;t have a booking on file yet. Examples below use placeholder text until you have an
              appointment.
            </p>
          ) : (
            <select
              value={selectedAppointmentId}
              onChange={(e) => {
                setSelectedAppointmentId(e.target.value);
                setReminderMessage(null);
              }}
              disabled={appointments.length === 0}
              className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 transition focus-ring disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
            >
              {appointments.length === 0 ? (
                <option value="">No appointments</option>
              ) : (
                appointments.map((appt) => (
                  <option key={appt.id} value={appt.id}>
                    {appointmentOptionLabel(appt)}
                  </option>
                ))
              )}
            </select>
          )}
          {isCustomer ? (
            selectedAppointment?.isVip ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-amber-950">
                <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.5} />
                Your booking includes VIP — VIP-only templates are available below.
              </p>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-stone-500">
                If you chose VIP when you booked, those templates unlock here for preview.
              </p>
            )
          ) : selectedAppointment?.isVip ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-amber-950">
              <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.5} />
              VIP booking — VIP-only templates unlock for this row.
            </p>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-stone-500">
              Clients choose VIP when booking. Without it, VIP-only templates stay inactive here.
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => {
              const locked = Boolean(t.requiresVip) && Boolean(selectedAppointment) && !selectedAppointment.isVip;
              return (
                <div
                  key={t.id}
                  className={`surface-card rounded-lg p-5 text-left transition-[box-shadow,border-color,opacity] duration-200 ${
                    locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-stone-400/90'
                  } ${selected === t.id ? 'border-stone-800 ring-1 ring-stone-800/15' : ''}`}
                  onClick={() => !locked && toggleTemplate(t.id, t.requiresVip)}
                  onKeyDown={(e) => {
                    if (locked) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleTemplate(t.id, t.requiresVip);
                    }
                  }}
                  role={locked ? undefined : 'button'}
                  tabIndex={locked ? -1 : 0}
                  title={
                    locked
                      ? isCustomer
                        ? 'VIP-only: your selected visit needs to be a VIP booking.'
                        : 'VIP-only template: choose a VIP appointment in the dropdown above.'
                      : undefined
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-stone-50">
                      <FileText className="h-4 w-4 text-stone-600" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display flex items-center gap-2 truncate text-lg text-stone-900">
                        {t.name}
                        {t.requiresVip ? (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-950 bg-amber-100/90">
                            VIP
                          </span>
                        ) : null}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-stone-500">{t.subject}</p>
                    </div>
                  </div>

                  {locked ? (
                    <p className="mt-4 border-t border-amber-200/60 pt-3 text-xs text-amber-950">
                      {isCustomer ? 'VIP preview only when your selected visit is VIP.' : 'Locked for non-VIP bookings.'}
                    </p>
                  ) : null}

                  {selected === t.id && (
                    <div className="mt-4 border-t border-stone-200/80 pt-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Preview</p>
                      <div
                        className="prose prose-sm max-w-none text-xs leading-relaxed text-stone-700 [&_li]:my-0.5"
                        dangerouslySetInnerHTML={{
                          __html: renderTemplatePreview(t.body, previewData as Record<string, string>),
                        }}
                      />
                    </div>
                  )}

                  {selected === t.id && (
                    <div className="mt-3">
                      <span className="inline-block rounded-md border border-stone-900 bg-stone-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-50">
                        Selected
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="surface-muted rounded-lg border-stone-300/80 p-5 sm:p-6">
            {isCustomer ? (
              <p className="text-sm leading-relaxed text-stone-700">
                This is a sample only. The salon sends real confirmations and reminders; nothing leaves this page from
                your account.
              </p>
            ) : isAdmin ? (
              <>
                <p className="text-sm leading-relaxed text-stone-800">
                  Send as a <strong className="font-semibold">reminder</strong> to{' '}
                  <span className="whitespace-nowrap font-medium">{selectedAppointment?.customerEmail || '…'}</span>{' '}
                  for the appointment above.
                </p>
                {vipTemplateLocked ? (
                  <p className="mt-3 text-sm text-amber-950">Choose a VIP booking in the list to use this template.</p>
                ) : (
                  <Button className="mt-4" onClick={() => void handleSendReminder()} loading={sendingReminder} disabled={!selectedAppointmentId}>
                    Send reminder email
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-stone-700">
                Only admins can send reminder emails from here. You can still use the list above to preview how a
                client email would read.
              </p>
            )}
            {isAdmin && reminderMessage ? (
              <p
                className={`mt-3 text-sm font-medium ${reminderMessage.type === 'ok' ? 'text-emerald-800' : 'text-red-800'}`}
                role="status"
              >
                {reminderMessage.text}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
