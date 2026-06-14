import dayjs from 'dayjs';
import { Op } from 'sequelize';
import { Appointment, WaitlistEntry, VisitFeedback, RetailProduct, User, Service, sequelize } from '../models/Index.js';

class DashboardService {
  async summary(userId, role, salonId = null) {
    const today = dayjs().format('YYYY-MM-DD');
    const weekEnd = dayjs().add(7, 'day').format('YYYY-MM-DD');
    const salonWide = role === 'admin' || role === 'staff';
    const apptScope = salonWide && salonId ? { salonId } : salonWide ? {} : { userId };

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
        where: {
          status: 'pending',
          ...(salonWide && salonId ? { salonId } : salonWide ? {} : { userId }),
        },
      }),
      salonWide && salonId
        ? RetailProduct.count({ where: { isActive: true, stockQty: { [Op.lt]: 5 }, salonId } })
        : Promise.resolve(0),
      salonWide && salonId
        ? VisitFeedback.findOne({
            attributes: [[sequelize.fn('AVG', sequelize.col('VisitFeedback.rating')), 'avg']],
            include: [
              {
                model: Appointment,
                as: 'appointment',
                attributes: [],
                where: { salonId },
                required: true,
              },
            ],
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

    const spotlightRows = await Appointment.findAll({
      where: {
        ...apptScope,
        appointmentDate: { [Op.gte]: today },
        status: { [Op.notIn]: ['cancelled', 'completed'] },
      },
      include: [
        { model: Service, as: 'service', attributes: ['name'], required: false },
        { model: User, as: 'assignedStaff', attributes: ['name'], required: false },
      ],
      order: [
        ['appointmentDate', 'ASC'],
        ['startTime', 'ASC'],
      ],
      limit: 6,
      attributes: ['id', 'customerName', 'appointmentDate', 'startTime', 'status', 'isVip'],
    });

    const formatTime = (t) => {
      if (t == null) return '';
      const s = typeof t === 'string' ? t : dayjs(t).format('HH:mm:ss');
      return s.length >= 5 ? s.slice(0, 5) : s;
    };

    const spotlightAppointments = spotlightRows.map((a) => ({
      id: a.id,
      customerName: a.customerName,
      appointmentDate: a.appointmentDate,
      startTime: formatTime(a.startTime),
      status: a.status,
      isVip: Boolean(a.isVip),
      serviceName: a.service?.name ?? null,
      staffName: a.assignedStaff?.name ?? null,
    }));

    return {
      appointmentsToday,
      upcomingWeek,
      pendingAppointments,
      vipUpcoming,
      waitlistPending,
      retailLowStock: salonWide ? retailLowStock : undefined,
      averageVisitRating: salonWide ? averageVisitRating : undefined,
      loyaltyPoints: salonWide ? undefined : loyaltyPoints,
      spotlightAppointments,
    };
  }
}

export default new DashboardService();
