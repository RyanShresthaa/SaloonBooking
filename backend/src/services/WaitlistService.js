import { WaitlistEntry, Service } from '../models/Index.js';
import auditService from './AuditService.js';

class WaitlistService {
  async list(userId, role) {
    const where = role === 'admin' || role === 'staff' ? {} : { userId };
    return WaitlistEntry.findAll({
      where,
      include: [
        { association: 'service', attributes: ['id', 'name', 'duration', 'price'] },
        { association: 'user', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async create({ userId, serviceId, preferredDate, phone, notes }) {
    const service = await Service.findByPk(serviceId);
    if (!service) {
      const error = new Error('Service not found');
      error.statusCode = 404;
      throw error;
    }
    const row = await WaitlistEntry.create({
      userId,
      serviceId,
      preferredDate: preferredDate || null,
      phone: phone || null,
      notes: notes || null,
      status: 'pending',
    });
    await auditService.log({
      actorUserId: userId,
      action: 'waitlist.create',
      entityType: 'waitlist_entry',
      entityId: row.id,
      metadata: { serviceId, status: 'pending' },
    });
    return row;
  }

  async updateStatus(id, status, userId, role) {
    const row = await WaitlistEntry.findByPk(id);
    if (!row) {
      const error = new Error('Waitlist entry not found');
      error.statusCode = 404;
      throw error;
    }

    const salonWide = role === 'admin' || role === 'staff';
    if (!salonWide) {
      if (row.userId !== userId) {
        const error = new Error('You are not authorized to update this entry');
        error.statusCode = 403;
        throw error;
      }
      if (status !== 'cancelled') {
        const error = new Error('Customers may only cancel their own waitlist request');
        error.statusCode = 400;
        throw error;
      }
    }

    const allowed = ['pending', 'contacted', 'fulfilled', 'cancelled'];
    if (!allowed.includes(status)) {
      const error = new Error('Invalid status');
      error.statusCode = 400;
      throw error;
    }

    const prevStatus = row.status;
    await row.update({ status });
    await auditService.log({
      actorUserId: userId,
      action: 'waitlist.status_update',
      entityType: 'waitlist_entry',
      entityId: row.id,
      metadata: { prevStatus, status },
    });
    return row.reload({
      include: [
        { association: 'service', attributes: ['id', 'name', 'duration', 'price'] },
        { association: 'user', attributes: ['id', 'name', 'email'] },
      ],
    });
  }
}

export default new WaitlistService();
