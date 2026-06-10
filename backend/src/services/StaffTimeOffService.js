import { Op } from 'sequelize';
import { StaffTimeOff, User } from '../models/Index.js';

class StaffTimeOffService {
  async list() {
    return StaffTimeOff.findAll({
      include: [{ association: 'staffMember', attributes: ['id', 'name', 'email', 'role', 'speciality'] }],
      order: [['startDate', 'DESC']],
      limit: 200,
    });
  }

  async create({ userId, startDate, endDate, reason }) {
    const u = await User.findByPk(userId, { attributes: ['id', 'role'] });
    if (!u || !['admin', 'staff'].includes(String(u.role || '').toLowerCase())) {
      const error = new Error('Time off can only be assigned to salon staff');
      error.statusCode = 400;
      throw error;
    }
    if (String(startDate) > String(endDate)) {
      const error = new Error('startDate must be on or before endDate');
      error.statusCode = 400;
      throw error;
    }
    return StaffTimeOff.create({ userId, startDate, endDate, reason: reason || null });
  }

  async remove(id) {
    const row = await StaffTimeOff.findByPk(id);
    if (!row) {
      const error = new Error('Time off entry not found');
      error.statusCode = 404;
      throw error;
    }
    await row.destroy();
  }

  /** True if staff has any time-off covering date (YYYY-MM-DD). */
  async isStaffOffOnDate(userId, dateStr) {
    const hit = await StaffTimeOff.findOne({
      where: {
        userId,
        startDate: { [Op.lte]: dateStr },
        endDate: { [Op.gte]: dateStr },
      },
    });
    return Boolean(hit);
  }
}

export default new StaffTimeOffService();
