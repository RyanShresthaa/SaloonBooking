import * as xlsx from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { Sequelize, QueryTypes, Op } from 'sequelize';
import {
  NotificationLog,
  NotificationTemplate,
  Appointment,
  sequelize,
} from '../models/Index.js';
import notificationQueue from '../queues/NotificationQueue.js';
import {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
  sendForbidden,
} from '../utils/apiResponse.js';
import { getIO } from '../sockets/Index.js';
import { sendEmail, renderAppointmentEmail } from '../utils/emailHelper.js';

// ─── Constants ───

const QUEUE_ADD_TIMEOUT_MS = 5000;
const QUEUE_ADD_TIMEOUT_MESSAGE = 'Notification queue timeout. Check Redis connection.';
const BULK_BATCH_HISTORY_LIMIT = 50;
const HTTP_ACCEPTED = 202;
const DEFAULT_CUSTOMER_PLACEHOLDER = 'Valued Customer';
const ROLE_ADMIN = 'admin';
const ROLE_STAFF = 'staff';
const ROLE_SUPER_ADMIN = 'super_admin';

// ─── Helpers ───

/** Salon that owns this log (appointment wins; else template). */
const resolveLogSalonId = async (log) => {
  if (log.appointmentId) {
    const appt = await Appointment.findByPk(log.appointmentId, { attributes: ['salonId'] });
    if (appt?.salonId) return appt.salonId;
  }
  if (log.templateId) {
    const t = await NotificationTemplate.findByPk(log.templateId, { attributes: ['salonId'] });
    if (t?.salonId) return t.salonId;
  }
  return null;
};

/**
 * Approve / decline / mark-finished / approve-all / reminder: only that salon's desk (not platform super_admin).
 * @returns {string|null} Forbidden reason, or null if allowed.
 */
const getSalonModerationBlockReason = (req, salonId) => {
  const roleNorm = String(req.user.role || '').toLowerCase();
  if (roleNorm === ROLE_SUPER_ADMIN) {
    return 'Platform administrators cannot approve, decline, or finish booking notifications for salons.';
  }
  if (roleNorm !== ROLE_ADMIN && roleNorm !== ROLE_STAFF) {
    return 'Only salon desk staff can perform this action.';
  }
  if (!req.user.salonId) {
    return 'Your account is not linked to a salon.';
  }
  if (!salonId) {
    return 'Cannot determine which salon this message belongs to.';
  }
  if (String(req.user.salonId) !== String(salonId)) {
    return 'You can only manage notifications for your own salon.';
  }
  return null;
};

const withTimeout = (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

const emitNotificationUpdate = (payload) => {
  try {
    getIO().emit('notification:update', payload);
  } catch {
    // Socket may be unavailable (e.g. unit tests without IO).
  }
};

const normalizeEmail = (e) => (e || '').trim().toLowerCase();

const logPassesVipApprovalRules = async (log) => {
  const template = await NotificationTemplate.findByPk(log.templateId);
  if (!template?.requiresVip) return true;
  if (log.appointmentData?.isVip) return true;
  if (!log.appointmentId) return false;
  const appt = await Appointment.findByPk(log.appointmentId);
  return Boolean(appt?.isVip);
};

/**
 * Queue Bull job and mark log queued (after admin approval).
 */
const addLogToQueue = async (log) => {
  const appointmentData = log.appointmentData || {
    customerName: DEFAULT_CUSTOMER_PLACEHOLDER,
    serviceName: '',
    date: '',
    time: '',
    isVip: false,
  };

  const job = await withTimeout(
    notificationQueue.add({
      logId: log.id,
      templateId: log.templateId,
      recipientEmail: log.recipientEmail,
      batchId: log.batchId,
      appointmentData,
    }),
    QUEUE_ADD_TIMEOUT_MS,
    QUEUE_ADD_TIMEOUT_MESSAGE
  );

  await log.update({ status: 'queued', jobId: String(job.id) });
  emitNotificationUpdate({
    logId: log.id,
    batchId: log.batchId,
    recipientEmail: log.recipientEmail,
    status: 'queued',
  });
  return log.reload();
};

// ─── Handlers ───

const bulkNotify = async (req, res, next) => {
  try {
    if (!req.file) return sendBadRequest(res, 'Excel file is required');

    const { templateId } = req.body;
    if (!templateId) return sendBadRequest(res, 'templateId is required');

    const template = await NotificationTemplate.findByPk(templateId);
    if (!template) return sendNotFound(res, 'Template not found');

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (!rows.length) return sendBadRequest(res, 'Excel file is empty');

    const batchId = uuidv4();
    const validRows = rows.filter((row) => row.customerEmail);

    let pendingApproval = 0;
    let autoDeclined = 0;

    for (const row of validRows) {
      const {
        customerName,
        customerEmail,
        serviceName,
        date,
        time,
        appointmentId: rowAppointmentId,
      } = row;

      let appointment = null;
      if (rowAppointmentId) {
        appointment = await Appointment.findByPk(rowAppointmentId, {
          include: [{ association: 'service', attributes: ['name'] }],
        });
      }

      if (appointment && normalizeEmail(appointment.customerEmail) !== normalizeEmail(customerEmail)) {
        await NotificationLog.create({
          templateId,
          recipientEmail: customerEmail,
          subject: template.subject,
          status: 'declined',
          batchId,
          appointmentId: appointment.id,
          errorMessage: 'Email in file does not match linked appointment',
          appointmentData: {
            customerName: customerName || appointment.customerName || DEFAULT_CUSTOMER_PLACEHOLDER,
            serviceName: serviceName || appointment.service?.name || '',
            date: date || appointment.appointmentDate || '',
            time: time || appointment.startTime || '',
            isVip: appointment.isVip,
          },
        });
        autoDeclined += 1;
        continue;
      }

      if (template.requiresVip && (!appointment || !appointment.isVip)) {
        await NotificationLog.create({
          templateId,
          recipientEmail: customerEmail,
          subject: template.subject,
          status: 'declined',
          batchId,
          appointmentId: appointment?.id || null,
          errorMessage:
            'VIP-only template: add appointmentId for a booking where the customer selected VIP at booking time.',
          appointmentData: {
            customerName: customerName || appointment?.customerName || DEFAULT_CUSTOMER_PLACEHOLDER,
            serviceName: serviceName || appointment?.service?.name || '',
            date: date || appointment?.appointmentDate || '',
            time: time || appointment?.startTime || '',
            isVip: Boolean(appointment?.isVip),
          },
        });
        autoDeclined += 1;
        continue;
      }

      const isVip = Boolean(appointment?.isVip);
      const appointmentData = {
        customerName: appointment?.customerName || customerName || DEFAULT_CUSTOMER_PLACEHOLDER,
        serviceName: appointment?.service?.name || serviceName || '',
        date: appointment?.appointmentDate || date || '',
        time: appointment?.startTime || time || '',
        isVip,
      };

      await NotificationLog.create({
        templateId,
        recipientEmail: customerEmail,
        subject: template.subject,
        status: 'pending_approval',
        batchId,
        appointmentId: appointment?.id || null,
        appointmentData,
      });
      pendingApproval += 1;
    }

    return res.status(HTTP_ACCEPTED).json({
      success: true,
      message: `${pendingApproval} message(s) await admin approval.${
        autoDeclined ? ` ${autoDeclined} row(s) were declined automatically (VIP rules or email mismatch).` : ''
      }`,
      data: {
        batchId,
        total: validRows.length,
        pendingApproval,
        autoDeclined,
        queued: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

const sendReminderEmail = async (req, res, next) => {
  try {
    const { appointmentId, templateId } = req.body;
    if (!appointmentId || !templateId) {
      return sendBadRequest(res, 'appointmentId and templateId are required');
    }

    const appointment = await Appointment.findByPk(appointmentId, {
      include: [{ association: 'service', attributes: ['name'] }],
    });
    if (!appointment) return sendNotFound(res, 'Appointment not found');

    const block = getSalonModerationBlockReason(req, appointment.salonId);
    if (block) return sendForbidden(res, block);

    const template = await NotificationTemplate.findByPk(templateId);
    if (!template || !template.isActive) return sendNotFound(res, 'Template not found');
    if (String(template.salonId) !== String(appointment.salonId)) {
      return sendBadRequest(res, 'This template does not belong to the same salon as the appointment.');
    }

    if (template.requiresVip && !appointment.isVip) {
      return sendBadRequest(
        res,
        'This template is only for VIP bookings. The customer must select VIP when booking, or an admin can flag the booking as VIP when editing it.'
      );
    }

    const appointmentData = {
      customerName: appointment.customerName,
      serviceName: appointment.service?.name || '',
      date: appointment.appointmentDate,
      time: appointment.startTime,
      isVip: appointment.isVip,
    };

    const html = renderAppointmentEmail(template.body, appointmentData);

    await sendEmail({
      to: appointment.customerEmail,
      subject: template.subject,
      html,
    });

    const log = await NotificationLog.create({
      templateId,
      appointmentId: appointment.id,
      recipientEmail: appointment.customerEmail,
      subject: template.subject,
      status: 'sent',
      appointmentData: { ...appointmentData, source: 'reminder' },
      bookingMarkedFinished: false,
      sentByUserId: req.user.id,
    });

    return sendSuccess(res, log, 'Reminder email sent');
  } catch (error) {
    next(error);
  }
};

const markBookingFinished = async (req, res, next) => {
  try {
    const log = await NotificationLog.findByPk(req.params.id);
    if (!log) return sendNotFound(res, 'Log not found');
    const salonId = await resolveLogSalonId(log);
    const block = getSalonModerationBlockReason(req, salonId);
    if (block) return sendForbidden(res, block);
    if (!log.appointmentId) {
      return sendBadRequest(res, 'This notification is not linked to a booking');
    }
    if (log.status !== 'sent') {
      return sendBadRequest(res, 'The email must be sent before you can mark the booking follow-up finished');
    }
    if (log.bookingMarkedFinished) {
      return sendBadRequest(res, 'Already marked finished');
    }

    await log.update({ bookingMarkedFinished: true });
    emitNotificationUpdate({
      logId: log.id,
      batchId: log.batchId,
      recipientEmail: log.recipientEmail,
      status: log.status,
      bookingMarkedFinished: true,
    });
    const reloaded = await log.reload();
    return sendSuccess(res, reloaded, 'Booking follow-up marked finished');
  } catch (error) {
    next(error);
  }
};

const listBulkBatches = async (req, res, next) => {
  try {
    const role = req.user.role;
    const userEmail = (req.user.email || '').trim().toLowerCase();
    const roleNorm = String(role || '').toLowerCase();
    const isSuperAdmin = roleNorm === ROLE_SUPER_ADMIN;
    const userSalonId = req.user.salonId;
    const isSalonDesk = (roleNorm === ROLE_ADMIN || roleNorm === ROLE_STAFF) && userSalonId;
    const isLegacyGlobalAdmin = roleNorm === ROLE_ADMIN && !userSalonId;

    if (isSuperAdmin) {
      return sendSuccess(res, [], 'Bulk batch history retrieved');
    }

    let batchScopeSql = '';
    const bind = [];
    if (isLegacyGlobalAdmin) {
      batchScopeSql = '';
    } else if (isSalonDesk) {
      batchScopeSql = `AND nl."batchId" IN (
        SELECT DISTINCT nl3."batchId" FROM notification_logs nl3
        LEFT JOIN appointments a ON a.id = nl3."appointmentId"
        LEFT JOIN notification_templates t ON t.id = nl3."templateId"
        WHERE (a."salonId" = $1 OR t."salonId" = $1)
      )`;
      bind.push(userSalonId);
    } else {
      if (!userEmail) {
        return sendSuccess(res, [], 'Bulk batch history retrieved');
      }
      batchScopeSql = `AND nl."batchId" IN (
        SELECT DISTINCT nl2."batchId"
        FROM notification_logs nl2
        WHERE nl2."batchId" IS NOT NULL
          AND LOWER(TRIM(nl2."recipientEmail")) = $1
      )`;
      bind.push(userEmail);
    }

    const aggregateSql = `
      SELECT nl."batchId",
             MIN(nl."createdAt") AS "startedAt",
             COUNT(*)::int AS "total",
             COALESCE(SUM(CASE WHEN nl.status = 'sent' THEN 1 ELSE 0 END), 0)::int AS "sent",
             COALESCE(SUM(CASE WHEN nl.status IN ('failed', 'declined') THEN 1 ELSE 0 END), 0)::int AS "failed",
             COALESCE(SUM(CASE WHEN nl.status = 'pending_approval' THEN 1 ELSE 0 END), 0)::int AS "awaitingApproval",
             COALESCE(SUM(CASE WHEN nl.status IN ('queued', 'processing', 'pending_approval') THEN 1 ELSE 0 END), 0)::int AS "pending"
      FROM notification_logs nl
      WHERE nl."batchId" IS NOT NULL
      ${batchScopeSql}
      GROUP BY nl."batchId"
      ORDER BY MIN(nl."createdAt") DESC
      LIMIT ${BULK_BATCH_HISTORY_LIMIT}
    `;

    const rows = await sequelize.query(aggregateSql, {
      bind,
      type: QueryTypes.SELECT,
    });

    return sendSuccess(res, rows, 'Bulk batch history retrieved');
  } catch (error) {
    next(error);
  }
};

const getLogs = async (req, res, next) => {
  try {
    const { batchId } = req.query;
    const role = req.user.role;
    const userEmail = (req.user.email || '').trim().toLowerCase();
    const roleNorm = String(role || '').toLowerCase();
    const isSuperAdmin = roleNorm === ROLE_SUPER_ADMIN;
    const userSalonId = req.user.salonId;
    const isSalonDesk = (roleNorm === ROLE_ADMIN || roleNorm === ROLE_STAFF) && userSalonId;
    const isLegacyGlobalAdmin = roleNorm === ROLE_ADMIN && !userSalonId;

    if (isSuperAdmin) {
      return sendSuccess(res, [], 'Notification logs retrieved');
    }

    const where = {};

    if (batchId) {
      where.batchId = batchId;
    }

    if (isLegacyGlobalAdmin) {
      // Single-tenant / bootstrap: admin with no salonId sees all logs.
    } else if (isSalonDesk) {
      where[Op.or] = [
        { '$appointment.salonId$': userSalonId },
        { '$template.salonId$': userSalonId },
      ];
    } else {
      if (!userEmail) {
        return sendSuccess(res, [], 'Notification logs retrieved');
      }
      where.recipientEmail = Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('recipientEmail')),
        userEmail
      );
    }

    const order = batchId ? [['createdAt', 'ASC']] : [['createdAt', 'DESC']];

    const logs = await NotificationLog.findAll({
      where,
      include: [
        { association: 'template', attributes: ['id', 'name', 'subject', 'requiresVip', 'salonId'] },
        {
          association: 'appointment',
          required: false,
          attributes: ['id', 'appointmentDate', 'startTime', 'status', 'isVip', 'customerName', 'salonId'],
          include: [{ association: 'service', attributes: ['name'] }],
        },
        {
          association: 'sentBy',
          required: false,
          attributes: ['id', 'name', 'email'],
        },
      ],
      order,
      subQuery: false,
    });

    return sendSuccess(res, logs, 'Notification logs retrieved');
  } catch (error) {
    next(error);
  }
};

const approveNotificationLog = async (req, res, next) => {
  try {
    const log = await NotificationLog.findByPk(req.params.id);
    if (!log) return sendNotFound(res, 'Log not found');
    const salonId = await resolveLogSalonId(log);
    const block = getSalonModerationBlockReason(req, salonId);
    if (block) return sendForbidden(res, block);
    if (log.status !== 'pending_approval') {
      return sendBadRequest(res, 'This message is not awaiting approval');
    }

    const vipOk = await logPassesVipApprovalRules(log);
    if (!vipOk) {
      return sendBadRequest(
        res,
        'Cannot approve: VIP-only template requires a VIP booking. Link the correct appointmentId in your upload or use a non-VIP template.'
      );
    }

    try {
      const updated = await addLogToQueue(log);
      return sendSuccess(res, updated, 'Message approved and queued for delivery');
    } catch (error) {
      await log.update({ status: 'failed', errorMessage: error.message });
      emitNotificationUpdate({
        logId: log.id,
        batchId: log.batchId,
        recipientEmail: log.recipientEmail,
        status: 'failed',
        error: error.message,
      });
      return next(error);
    }
  } catch (error) {
    next(error);
  }
};

const declineNotificationLog = async (req, res, next) => {
  try {
    const log = await NotificationLog.findByPk(req.params.id);
    if (!log) return sendNotFound(res, 'Log not found');
    const salonId = await resolveLogSalonId(log);
    const block = getSalonModerationBlockReason(req, salonId);
    if (block) return sendForbidden(res, block);
    if (log.status !== 'pending_approval') {
      return sendBadRequest(res, 'This message is not awaiting approval');
    }

    await log.update({ status: 'declined', errorMessage: 'Declined by admin' });
    emitNotificationUpdate({
      logId: log.id,
      batchId: log.batchId,
      recipientEmail: log.recipientEmail,
      status: 'declined',
    });
    const reloaded = await log.reload();
    return sendSuccess(res, reloaded, 'Message declined');
  } catch (error) {
    next(error);
  }
};

const approveAllInBatch = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const logs = await NotificationLog.findAll({
      where: { batchId, status: 'pending_approval' },
      order: [['createdAt', 'ASC']],
    });

    const errors = [];
    let approved = 0;
    for (const log of logs) {
      const salonId = await resolveLogSalonId(log);
      const block = getSalonModerationBlockReason(req, salonId);
      if (block || !salonId) {
        errors.push({ logId: log.id, message: block || 'Cannot determine which salon this row belongs to.' });
        continue;
      }
      const vipOk = await logPassesVipApprovalRules(log);
      if (!vipOk) {
        await log.update({
          status: 'declined',
          errorMessage: 'VIP rules: cannot approve without a VIP booking linked to this row.',
        });
        emitNotificationUpdate({
          logId: log.id,
          batchId: log.batchId,
          recipientEmail: log.recipientEmail,
          status: 'declined',
        });
        errors.push({ logId: log.id, message: 'VIP approval rules failed' });
        continue;
      }
      try {
        await addLogToQueue(log);
        approved += 1;
      } catch (e) {
        errors.push({ logId: log.id, message: e.message });
        await log.update({ status: 'failed', errorMessage: e.message });
        emitNotificationUpdate({
          logId: log.id,
          batchId: log.batchId,
          recipientEmail: log.recipientEmail,
          status: 'failed',
          error: e.message,
        });
      }
    }

    return sendSuccess(
      res,
      { approved, failed: errors.length, errors },
      'Batch approval finished'
    );
  } catch (error) {
    next(error);
  }
};

// ─── Exports ───

export {
  bulkNotify,
  getLogs,
  listBulkBatches,
  approveNotificationLog,
  declineNotificationLog,
  approveAllInBatch,
  sendReminderEmail,
  markBookingFinished,
};
