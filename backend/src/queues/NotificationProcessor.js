import notificationQueue from './NotificationQueue.js';
import { NotificationLog, NotificationTemplate } from '../models/Index.js';
import { sendEmail, renderAppointmentEmail } from '../utils/emailHelper.js';
import logger from '../utils/Logger.js';
import env from '../config/Env.js';
import { getIO } from '../sockets/Index.js';

const workerConcurrency = env.nodeEnv === 'production' ? 3 : 10;

notificationQueue.process(workerConcurrency, async (job) => {
  const { logId, templateId, recipientEmail, appointmentData, batchId } = job.data;

  const log = await NotificationLog.findByPk(logId);
  if (!log) throw new Error(`NotificationLog ${logId} not found`);

  if (log.status === 'declined' || log.status === 'sent') {
    logger.warn(`Skipping job for log ${logId}: already ${log.status}`);
    return;
  }

  await log.update({ status: 'processing' });

  const io = getIO();
  io.emit('notification:update', { logId, batchId, status: 'processing' });

  try {
    const template = await NotificationTemplate.findByPk(templateId);
    if (!template) throw new Error('Template not found');

    const mergedAppointmentData = {
      ...(log.appointmentData || {}),
      ...(appointmentData || {}),
    };

    const html = renderAppointmentEmail(template.body, mergedAppointmentData);

    await sendEmail({
      to: recipientEmail,
      subject: template.subject,
      html,
    });

    await log.update({ status: 'sent' });
    io.emit('notification:update', { logId, batchId, status: 'sent', recipientEmail });
    logger.info(`Notification sent to ${recipientEmail} [job ${job.id}]`);
  } catch (error) {
    await log.update({ status: 'failed', errorMessage: error.message });
    io.emit('notification:update', { logId, batchId, status: 'failed', recipientEmail, error: error.message });
    logger.error(`Notification failed for ${recipientEmail}:`, error);
    throw error;
  }
});

notificationQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed after all retries: ${err.message}`);
});

logger.info('Notification queue processor started');

export default notificationQueue;
