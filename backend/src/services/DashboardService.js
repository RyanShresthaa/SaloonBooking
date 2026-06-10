import dayjs from 'dayjs';
import { Op } from 'sequelize';
import { Appointment, WaitlistEntry, VisitFeedback, RetailProduct, User, sequelize } from '../models/Index.js';

class DashboardService {
  async summary(userId, role) {
    const today = dayjs().format('YYYY-MM-DD');
    const weekEnd = dayjs().add(7, 'day').format('YYYY-MM-DD');
    const salonWide = role === 'admin' || role === 'staff';
    const apptScope = salonWide ? {} : { userId };

    const [
      appointmentsToday,
      upcomingWeek,
      pendingAppointments,
      vipUpcoming,
      waitlistPending,
      retailLowStock,
      avgRow,
    ] = await Promise.all([
      Appointment.count({
        where: { ...apptScope, appointmentDate: today, status: { [Op.ne]: 'cancelled' } },
      }),
      Appointment.count({
        where: {
          ...apptScope,
          appointmentDate: { [Op.between]: [today, weekEnd] },
          status: { [Op.notIn]: ['cancelled', 'completed'] },
        },
      }),
      Appointment.count({ where: { ...apptScope, status: 'pending' } }),
      Appointment.count({
        where: {
          ...apptScope,
          isVip: true,
          appointmentDate: { [Op.gte]: today },
          status: { [Op.ne]: 'cancelled' },
        },
      }),
      WaitlistEntry.count({
        where: { status: 'pending', ...(salonWide ? {} : { userId }) },
      }),
      salonWide
        ? RetailProduct.count({ where: { isActive: true, stockQty: { [Op.lt]: 5 } } })
        : Promise.resolve(0),
      salonWide
        ? VisitFeedback.findOne({
            attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg']],
            raw: true,
          })
        : Promise.resolve(null),
    ]);

    let loyaltyPoints;
    if (!salonWide) {
      const u = await User.findByPk(userId, { attributes: ['loyaltyPoints'] });
      loyaltyPoints = u?.loyaltyPoints ?? 0;
    }

    const averageVisitRating =
      avgRow && avgRow.avg != null ? Math.round(Number(avgRow.avg) * 10) / 10 : null;

    return {
      appointmentsToday,
      upcomingWeek,
      pendingAppointments,
      vipUpcoming,
      waitlistPending,
      retailLowStock: salonWide ? retailLowStock : undefined,
      averageVisitRating: salonWide ? averageVisitRating : undefined,
      loyaltyPoints: salonWide ? undefined : loyaltyPoints,
    };
  }
}

export default new DashboardService();
