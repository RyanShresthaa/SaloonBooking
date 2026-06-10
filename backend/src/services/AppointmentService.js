import { Op } from 'sequelize';
import dayjs from 'dayjs';
import { Appointment, Service, User, sequelize, StaffTimeOff } from '../models/Index.js';
import auditService from './AuditService.js';
import { emitAppointmentUpdated } from '../sockets/Index.js';
import { blockedInterval, intervalsOverlap } from '../utils/schedulingEngine.js';

const BREAK_START = '12:00';
const BREAK_END = '14:00';

const BUSINESS_START = '09:00';
const BUSINESS_END = '18:00';

const CUSTOMER_CANCEL_MIN_HOURS = 24;
const CUSTOMER_RESCHEDULE_MIN_HOURS = 48;

class AppointmentService {
  async getAvailableSlots(serviceId, date, staffId = null) {
    const service = await Service.findByPk(serviceId);
    if (!service) {
      const error = new Error('Service not found');
      error.statusCode = 404;
      throw error;
    }

    if (!service.resourceId) {
      const error = new Error('Service is missing a scheduling resource');
      error.statusCode = 400;
      throw error;
    }

    if (staffId) {
      const off = await StaffTimeOff.findOne({
        where: {
          userId: staffId,
          startDate: { [Op.lte]: date },
          endDate: { [Op.gte]: date },
        },
      });
      if (off) {
        return { service, date, slots: [] };
      }
      const u = await User.findByPk(staffId, { attributes: ['id', 'role'] });
      if (!u || !['admin', 'staff'].includes(String(u.role || '').toLowerCase())) {
        const error = new Error('Invalid staff member');
        error.statusCode = 400;
        throw error;
      }
    }

    const existingAppointments = await Appointment.findAll({
      where: {
        resourceId: service.resourceId,
        appointmentDate: date,
        status: { [Op.notIn]: ['cancelled'] },
      },
      include: [{ association: 'service', attributes: ['id', 'duration', 'bufferBeforeMinutes', 'bufferAfterMinutes'] }],
    });

    let staffAppointments = [];
    if (staffId) {
      staffAppointments = await Appointment.findAll({
        where: {
          assignedStaffId: staffId,
          appointmentDate: date,
          status: { [Op.notIn]: ['cancelled'] },
        },
        include: [{ association: 'service', attributes: ['id', 'duration', 'bufferBeforeMinutes', 'bufferAfterMinutes'] }],
      });
    }

    const slots = [];
    let current = dayjs(`${date} ${BUSINESS_START}`);
    const end = dayjs(`${date} ${BUSINESS_END}`);
    const breakStart = dayjs(`${date} ${BREAK_START}`);
    const breakEnd = dayjs(`${date} ${BREAK_END}`);

    while (current.isBefore(end)) {
      const slotEnd = current.add(service.duration, 'minute');

      if (slotEnd.isAfter(end)) break;

      const slotStartStr = current.format('HH:mm');
      const slotEndStr = slotEnd.format('HH:mm');

      const overlapsBreak = current.isBefore(breakEnd) && slotEnd.isAfter(breakStart);

      let isBooked = false;
      if (!overlapsBreak) {
        const candBlock = blockedInterval(date, slotStartStr, slotEndStr, service);
        isBooked = existingAppointments.some((appt) => {
          const blk = blockedInterval(date, appt.startTime, appt.endTime, appt.service);
          return intervalsOverlap(candBlock.start, candBlock.end, blk.start, blk.end);
        });
        if (!isBooked && staffId) {
          isBooked = staffAppointments.some((appt) => {
            const blk = blockedInterval(date, appt.startTime, appt.endTime, appt.service);
            return intervalsOverlap(candBlock.start, candBlock.end, blk.start, blk.end);
          });
        }
      }

      slots.push({
        startTime: slotStartStr,
        endTime: slotEndStr,
        available: !overlapsBreak && !isBooked,
      });

      current = current.add(service.duration, 'minute');
    }

    return { service, date, slots };
  }

  async _validateAssignedStaff(assignedStaffId) {
    if (!assignedStaffId) return;
    const u = await User.findByPk(assignedStaffId, { attributes: ['id', 'role'] });
    if (!u || !['admin', 'staff'].includes(String(u.role || '').toLowerCase())) {
      const error = new Error('Assigned staff must be a salon admin or staff member');
      error.statusCode = 400;
      throw error;
    }
  }

  _assertWithinBusinessHours(appointmentDate, startTime, serviceDurationMinutes) {
    const start = dayjs(`${appointmentDate} ${startTime}`);
    const end = start.add(serviceDurationMinutes, 'minute');
    const businessStart = dayjs(`${appointmentDate} ${BUSINESS_START}`);
    const businessEnd = dayjs(`${appointmentDate} ${BUSINESS_END}`);
    if (start.isBefore(businessStart) || end.isAfter(businessEnd)) {
      const error = new Error(`Appointments must be within business hours (${BUSINESS_START} - ${BUSINESS_END})`);
      error.statusCode = 400;
      throw error;
    }
    const breakStart = dayjs(`${appointmentDate} ${BREAK_START}`);
    const breakEnd = dayjs(`${appointmentDate} ${BREAK_END}`);
    if (start.isBefore(breakEnd) && end.isAfter(breakStart)) {
      const error = new Error(`Appointments cannot be scheduled during break time (${BREAK_START} - ${BREAK_END})`);
      error.statusCode = 400;
      throw error;
    }
    return { start, end, endTime: end.format('HH:mm') };
  }

  async _assertResourceAvailable({
    resourceId,
    appointmentDate,
    startTime,
    endTime,
    serviceForBuffers,
    excludeAppointmentId,
  }) {
    if (!resourceId) {
      const error = new Error('Service is missing a scheduling resource; contact the salon.');
      error.statusCode = 400;
      throw error;
    }

    const existing = await Appointment.findAll({
      where: {
        resourceId,
        appointmentDate,
        status: { [Op.notIn]: ['cancelled'] },
        ...(excludeAppointmentId ? { id: { [Op.ne]: excludeAppointmentId } } : {}),
      },
      include: [{ association: 'service', attributes: ['id', 'bufferBeforeMinutes', 'bufferAfterMinutes'] }],
    });

    const cand = blockedInterval(appointmentDate, startTime, endTime, serviceForBuffers);
    for (const ex of existing) {
      const blk = blockedInterval(appointmentDate, ex.startTime, ex.endTime, ex.service);
      if (intervalsOverlap(cand.start, cand.end, blk.start, blk.end)) {
        const error = new Error('This time slot is already booked');
        error.statusCode = 400;
        throw error;
      }
    }
  }

  async _assertStaffAvailable({
    staffUserId,
    appointmentDate,
    startTime,
    endTime,
    serviceForBuffers,
    excludeAppointmentId,
  }) {
    if (!staffUserId) return;

    const off = await StaffTimeOff.findOne({
      where: {
        userId: staffUserId,
        startDate: { [Op.lte]: appointmentDate },
        endDate: { [Op.gte]: appointmentDate },
      },
    });
    if (off) {
      const error = new Error('This stylist is not available on that date');
      error.statusCode = 400;
      throw error;
    }

    const others = await Appointment.findAll({
      where: {
        assignedStaffId: staffUserId,
        appointmentDate,
        status: { [Op.notIn]: ['cancelled'] },
        ...(excludeAppointmentId ? { id: { [Op.ne]: excludeAppointmentId } } : {}),
      },
      include: [{ association: 'service', attributes: ['id', 'bufferBeforeMinutes', 'bufferAfterMinutes'] }],
    });

    const cand = blockedInterval(appointmentDate, startTime, endTime, serviceForBuffers);
    for (const o of others) {
      const blk = blockedInterval(appointmentDate, o.startTime, o.endTime, o.service);
      if (intervalsOverlap(cand.start, cand.end, blk.start, blk.end)) {
        const error = new Error('This stylist is already booked at that time');
        error.statusCode = 400;
        throw error;
      }
    }
  }

  _hoursUntilAppointment(appointmentDate, startTime) {
    return dayjs(`${appointmentDate} ${startTime}`).diff(dayjs(), 'hour', true);
  }

  async createAppointment({
    userId,
    serviceId,
    customerName,
    customerEmail,
    customerPhone,
    appointmentDate,
    startTime,
    notes,
    isVip,
    emailRemindersOptIn,
    assignedStaffId,
    seriesId,
  }) {
    const service = await Service.findByPk(serviceId);
    if (!service) {
      const error = new Error('Service not found');
      error.statusCode = 404;
      throw error;
    }

    await this._validateAssignedStaff(assignedStaffId);

    const { endTime } = this._assertWithinBusinessHours(appointmentDate, startTime, service.duration);
    await this._assertResourceAvailable({
      resourceId: service.resourceId,
      appointmentDate,
      startTime,
      endTime,
      serviceForBuffers: service,
      excludeAppointmentId: null,
    });
    await this._assertStaffAvailable({
      staffUserId: assignedStaffId || null,
      appointmentDate,
      startTime,
      endTime,
      serviceForBuffers: service,
      excludeAppointmentId: null,
    });

    const appointment = await Appointment.create({
      userId,
      serviceId,
      customerName,
      customerEmail,
      customerPhone,
      appointmentDate,
      startTime,
      endTime,
      notes,
      isVip: Boolean(isVip),
      emailRemindersOptIn: emailRemindersOptIn === false ? false : true,
      assignedStaffId: assignedStaffId || null,
      seriesId: seriesId || null,
      resourceId: service.resourceId,
    });

    emitAppointmentUpdated({ type: 'created', appointmentId: appointment.id });
    await auditService.log({
      actorUserId: userId,
      action: 'appointment.create',
      entityType: 'appointment',
      entityId: appointment.id,
      metadata: { appointmentDate, startTime, serviceId },
    });

    return appointment;
  }

  async listAppointments(userId, role) {
    const roleNorm = String(role || '').toLowerCase();
    const salonWide = roleNorm === 'admin' || roleNorm === 'staff';
    const where = salonWide ? {} : { userId };
    return Appointment.findAll({
      where,
      include: [
        { association: 'service', attributes: ['id', 'name', 'duration', 'price', 'bufferBeforeMinutes', 'bufferAfterMinutes', 'resourceId'] },
        ...(salonWide
          ? [
              { association: 'user', attributes: ['id', 'name', 'email'] },
              {
                association: 'assignedStaff',
                attributes: ['id', 'name', 'email'],
                required: false,
              },
            ]
          : []),
      ],
      order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']],
    });
  }

  async listStaffAssignees() {
    return User.findAll({
      where: { role: { [Op.in]: ['admin', 'staff'] } },
      attributes: ['id', 'name', 'email', 'role', 'speciality'],
      order: [['name', 'ASC']],
    });
  }

  async exportAppointmentsCsv(userId, role) {
    const roleNorm = String(role || '').toLowerCase();
    if (roleNorm !== 'admin' && roleNorm !== 'staff') {
      const error = new Error('Only salon staff can export appointments');
      error.statusCode = 403;
      throw error;
    }
    const rows = await Appointment.findAll({
      include: [
        { association: 'service', attributes: ['name'] },
        { association: 'user', attributes: ['name', 'email'] },
        { association: 'assignedStaff', attributes: ['name'], required: false },
      ],
      order: [['appointmentDate', 'DESC'], ['startTime', 'DESC']],
    });

    const header = [
      'id',
      'appointmentDate',
      'startTime',
      'endTime',
      'status',
      'customerName',
      'customerEmail',
      'service',
      'bookedBy',
      'assignedStaff',
      'isVip',
    ].join(',');

    const esc = (v) => {
      const s = v === undefined || v === null ? '' : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const lines = rows.map((r) =>
      [
        r.id,
        r.appointmentDate,
        r.startTime,
        r.endTime,
        r.status,
        r.customerName,
        r.customerEmail,
        r.service?.name,
        r.user?.name,
        r.assignedStaff?.name,
        r.isVip ? 'yes' : 'no',
      ]
        .map(esc)
        .join(',')
    );

    return `${header}\n${lines.join('\n')}\n`;
  }

  async getAppointment(id, userId, role) {
    const appointment = await Appointment.findByPk(id, {
      include: [
        { association: 'service' },
        { association: 'user', attributes: ['id', 'name', 'email'] },
        { association: 'assignedStaff', attributes: ['id', 'name', 'email'], required: false },
      ],
    });
    if (!appointment) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }
    const roleNorm = String(role || '').toLowerCase();
    if (roleNorm === 'customer' && appointment.userId !== userId) {
      const error = new Error('You are not authorized to view this appointment');
      error.statusCode = 403;
      throw error;
    }
    return appointment;
  }

  async updateAppointment(id, userId, role, updates) {
    const appointment = await this.getAppointment(id, userId, role);

    const roleNorm = String(role || '').toLowerCase();
    const payload = { ...updates };

    if (roleNorm === 'customer') {
      delete payload.status;
      delete payload.isVip;
      delete payload.assignedStaffId;
      delete payload.loyaltyBonusApplied;
      delete payload.reminder24hSentAt;
      delete payload.endTime;

      const wantsReschedule = payload.appointmentDate != null || payload.startTime != null;
      if (wantsReschedule) {
        const hours = this._hoursUntilAppointment(appointment.appointmentDate, appointment.startTime);
        if (hours < CUSTOMER_RESCHEDULE_MIN_HOURS) {
          const error = new Error(
            `Reschedule at least ${CUSTOMER_RESCHEDULE_MIN_HOURS} hours before your visit, or call the salon.`
          );
          error.statusCode = 400;
          throw error;
        }
        if (!['pending', 'confirmed'].includes(appointment.status)) {
          const error = new Error('Only pending or confirmed visits can be rescheduled online');
          error.statusCode = 400;
          throw error;
        }
      }
    } else if (roleNorm === 'staff') {
      delete payload.isVip;
    }

    if (payload.assignedStaffId !== undefined) {
      await this._validateAssignedStaff(payload.assignedStaffId || null);
    }

    const prevStatus = appointment.status;
    const hadLoyaltyBonus = Boolean(appointment.loyaltyBonusApplied);
    const serviceId = appointment.serviceId;
    const service = await Service.findByPk(serviceId);
    if (!service) {
      const error = new Error('Service not found');
      error.statusCode = 404;
      throw error;
    }

    let nextDate = payload.appointmentDate ?? appointment.appointmentDate;
    let nextStart = payload.startTime ?? appointment.startTime;

    if (payload.appointmentDate != null || payload.startTime != null) {
      const { endTime } = this._assertWithinBusinessHours(nextDate, nextStart, service.duration);
      await this._assertResourceAvailable({
        resourceId: appointment.resourceId,
        appointmentDate: nextDate,
        startTime: nextStart,
        endTime,
        serviceForBuffers: service,
        excludeAppointmentId: appointment.id,
      });
      const staffForCheck = payload.assignedStaffId !== undefined ? payload.assignedStaffId : appointment.assignedStaffId;
      await this._assertStaffAvailable({
        staffUserId: staffForCheck || null,
        appointmentDate: nextDate,
        startTime: nextStart,
        endTime,
        serviceForBuffers: service,
        excludeAppointmentId: appointment.id,
      });
      payload.endTime = endTime;
    }

    if (payload.assignedStaffId !== undefined && payload.appointmentDate == null && payload.startTime == null) {
      await this._assertStaffAvailable({
        staffUserId: payload.assignedStaffId || null,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        serviceForBuffers: service,
        excludeAppointmentId: appointment.id,
      });
    }

    if (Object.keys(payload).length === 0) {
      return appointment.reload({ include: [{ association: 'service' }, { association: 'assignedStaff' }] });
    }

    await appointment.update(payload);
    let reloaded = await appointment.reload({
      include: [{ association: 'service' }, { association: 'assignedStaff' }],
    });

    if (
      (roleNorm === 'admin' || roleNorm === 'staff') &&
      payload.status === 'completed' &&
      prevStatus !== 'completed' &&
      !hadLoyaltyBonus
    ) {
      const t = await sequelize.transaction();
      try {
        const locked = await Appointment.findByPk(appointment.id, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (locked && !locked.loyaltyBonusApplied) {
          const owner = await User.findByPk(appointment.userId, { transaction: t, lock: t.LOCK.UPDATE });
          if (owner) {
            await owner.increment('loyaltyPoints', { by: 10, transaction: t });
          }
          await locked.update({ loyaltyBonusApplied: true }, { transaction: t });
        }
        await t.commit();
      } catch (e) {
        await t.rollback();
        throw e;
      }
      reloaded = await appointment.reload({
        include: [{ association: 'service' }, { association: 'assignedStaff' }],
      });
    }

    emitAppointmentUpdated({ type: 'updated', appointmentId: appointment.id });
    await auditService.log({
      actorUserId: userId,
      action: 'appointment.update',
      entityType: 'appointment',
      entityId: appointment.id,
      metadata: { changes: Object.keys(payload), prevStatus },
    });

    return reloaded;
  }

  async cancelAppointment(id, userId, role) {
    const appointment = await this.getAppointment(id, userId, role);
    const roleNorm = String(role || '').toLowerCase();

    if (roleNorm === 'customer') {
      if (!['pending', 'confirmed'].includes(appointment.status)) {
        const error = new Error('This visit cannot be cancelled online');
        error.statusCode = 400;
        throw error;
      }
      const hours = this._hoursUntilAppointment(appointment.appointmentDate, appointment.startTime);
      if (hours < CUSTOMER_CANCEL_MIN_HOURS) {
        const error = new Error(
          `Cancel at least ${CUSTOMER_CANCEL_MIN_HOURS} hours before your visit, or call the salon.`
        );
        error.statusCode = 400;
        throw error;
      }
    }

    await appointment.update({ status: 'cancelled' });
    emitAppointmentUpdated({ type: 'cancelled', appointmentId: appointment.id });
    await auditService.log({
      actorUserId: userId,
      action: 'appointment.cancel',
      entityType: 'appointment',
      entityId: appointment.id,
      metadata: {},
    });
    return appointment;
  }
}

export default new AppointmentService();
