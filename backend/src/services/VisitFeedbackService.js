import dayjs from 'dayjs';
import { VisitFeedback, Appointment, User } from '../models/Index.js';

const feedbackInclude = [
  { association: 'appointment', include: [{ association: 'service', attributes: ['name'] }] },
  { association: 'user', attributes: ['id', 'name', 'email'] },
];

function formatTimeForParse(t) {
  if (t == null) return '00:00:00';
  if (typeof t === 'string') return t.length >= 8 ? t.slice(0, 8) : `${t}:00`.slice(0, 8);
  return dayjs(t).format('HH:mm:ss');
}

class VisitFeedbackService {
  /** Customer may review after visit end, or anytime if staff marked completed. */
  _appointmentIsReviewable(appointment) {
    if (!appointment || appointment.status === 'cancelled') return false;
    if (appointment.status === 'completed') return true;
    if (appointment.status !== 'pending' && appointment.status !== 'confirmed') return false;
    const todayStr = dayjs().format('YYYY-MM-DD');
    const apptDateStr = dayjs(appointment.appointmentDate).format('YYYY-MM-DD');
    if (apptDateStr < todayStr) return true;
    const endStr = formatTimeForParse(appointment.endTime);
    const visitEnd = dayjs(`${apptDateStr} ${endStr}`);
    return !dayjs().isBefore(visitEnd);
  }

  /** Booking may be tied to salon desk userId but customerEmail matches the guest account. */
  async _customerOwnsAppointment(userId, appointment) {
    if (appointment.userId === userId) return true;
    const customer = await User.findByPk(userId, { attributes: ['email'] });
    const u = customer?.email?.trim().toLowerCase();
    const a = String(appointment.customerEmail || '')
      .trim()
      .toLowerCase();
    return Boolean(u && a && u === a);
  }

  async list(userId, role, salonId = null) {
    const salonWide = role === 'admin' || role === 'staff';
    if (salonWide && salonId) {
      return VisitFeedback.findAll({
        include: [
          {
            association: 'appointment',
            where: { salonId },
            required: true,
            include: [{ association: 'service', attributes: ['name'] }],
          },
          { association: 'user', attributes: ['id', 'name', 'email'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: 100,
      });
    }
    return VisitFeedback.findAll({
      where: { userId },
      include: feedbackInclude,
      order: [['createdAt', 'DESC']],
    });
  }

  async create(userId, { appointmentId, rating, comment }) {
    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }
    if (!(await this._customerOwnsAppointment(userId, appointment))) {
      const error = new Error('You can only leave feedback for your own visits');
      error.statusCode = 403;
      throw error;
    }
    if (appointment.status === 'cancelled') {
      const error = new Error('Cannot review a cancelled appointment');
      error.statusCode = 400;
      throw error;
    }
    if (!this._appointmentIsReviewable(appointment)) {
      const error = new Error('You can review after your visit has finished');
      error.statusCode = 400;
      throw error;
    }

    const existing = await VisitFeedback.findOne({ where: { appointmentId } });
    if (existing) {
      const error = new Error('Feedback already submitted for this visit');
      error.statusCode = 400;
      throw error;
    }

    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      const error = new Error('Rating must be an integer between 1 and 5');
      error.statusCode = 400;
      throw error;
    }

    const created = await VisitFeedback.create({
      appointmentId,
      userId,
      rating: r,
      comment: comment || null,
    });
    return VisitFeedback.findByPk(created.id, { include: feedbackInclude });
  }

  async update(userId, feedbackId, { rating, comment }) {
    if (rating === undefined && comment === undefined) {
      const error = new Error('Provide rating and/or comment to update');
      error.statusCode = 400;
      throw error;
    }

    const row = await VisitFeedback.findByPk(feedbackId);
    if (!row) {
      const error = new Error('Feedback not found');
      error.statusCode = 404;
      throw error;
    }
    if (row.userId !== userId) {
      const error = new Error('You can only edit your own reviews');
      error.statusCode = 403;
      throw error;
    }

    const updates = {};
    if (rating !== undefined) {
      const r = Number(rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        const error = new Error('Rating must be an integer between 1 and 5');
        error.statusCode = 400;
        throw error;
      }
      updates.rating = r;
    }
    if (comment !== undefined) {
      updates.comment = comment === '' || comment === null ? null : String(comment);
    }

    await row.update(updates);
    return VisitFeedback.findByPk(row.id, { include: feedbackInclude });
  }

  async remove(userId, feedbackId) {
    const row = await VisitFeedback.findByPk(feedbackId);
    if (!row) {
      const error = new Error('Feedback not found');
      error.statusCode = 404;
      throw error;
    }
    if (row.userId !== userId) {
      const error = new Error('You can only delete your own reviews');
      error.statusCode = 403;
      throw error;
    }
    await row.destroy();
  }
}

export default new VisitFeedbackService();
