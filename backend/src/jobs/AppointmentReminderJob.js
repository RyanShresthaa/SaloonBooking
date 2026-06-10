import { Op } from 'sequelize';
import dayjs from 'dayjs';
import { Appointment } from '../models/Index.js';
import env from '../config/Env.js';
import logger from '../utils/Logger.js';
import { sendEmail, buildAppointmentReminder24hHtml } from '../utils/emailHelper.js';

const WINDOW_LOW_H = 22;
const WINDOW_HIGH_H = 26;
const TICK_MS = 15 * 60 * 1000;

async function runReminderSweep() {
  if (env.features && env.features.reminderEmails === false) {
    return;
  }

  try {
    const rows = await Appointment.findAll({
      where: {
        status: { [Op.in]: ['pending', 'confirmed'] },
        emailRemindersOptIn: true,
        reminder24hSentAt: null,
      },
      include: [{ association: 'service', attributes: ['name'] }],
    });

    for (const a of rows) {
      const hours = dayjs(`${a.appointmentDate} ${a.startTime}`).diff(dayjs(), 'hour', true);
      if (hours < WINDOW_LOW_H || hours > WINDOW_HIGH_H) continue;

      const manageUrl = env.clientUrl ? `${env.clientUrl}/appointments/${a.id}/edit` : '';
      const html = buildAppointmentReminder24hHtml({
        customerName: a.customerName,
        serviceName: a.service?.name,
        date: String(a.appointmentDate),
        time: a.startTime,
        manageUrl,
      });

      try {
        if (env.email?.host && env.email?.user) {
          await sendEmail({
            to: a.customerEmail,
            subject: 'Reminder: your salon visit is coming up',
            html,
          });
        } else if (env.nodeEnv !== 'production') {
          logger.warn(
            `[dev] Reminder email skipped (no SMTP). Would send to ${a.customerEmail} for appointment ${a.id}`
          );
        } else {
          logger.warn(`Reminder skipped (no SMTP configured) for appointment ${a.id}`);
          continue;
        }
        await a.update({ reminder24hSentAt: new Date() });
      } catch (e) {
        logger.error(`Reminder send failed for appointment ${a.id}: ${e.message}`);
      }
    }
  } catch (e) {
    logger.error(`Reminder sweep error: ${e.message}`);
  }
}

export function startAppointmentReminderScheduler() {
  void runReminderSweep();
  const id = setInterval(() => void runReminderSweep(), TICK_MS);
  logger.info('Appointment reminder scheduler started (15m interval)');
  return () => clearInterval(id);
}

export default runReminderSweep;
