import appointmentService from '../services/AppointmentService.js';
import { User } from '../models/Index.js';
import { sendSuccess, sendCreated, sendBadRequest } from '../utils/apiResponse.js';
import { resolvePublicSalonId, requireStaffSalonId } from '../utils/salonScope.js';

// ─── Constants ───

const ROLE_CUSTOMER = 'customer';
const ROLE_ADMIN = 'admin';
const ROLE_STAFF = 'staff';
const CUSTOMER_EMAIL_MATCH_LIMIT = 2;

function staffSalonIdOrNull(user) {
  const r = String(user.role || '').toLowerCase();
  if (r !== ROLE_ADMIN && r !== ROLE_STAFF) return null;
  return requireStaffSalonId(user);
}

// ─── Handlers ───

const exportAppointmentsCsv = async (req, res, next) => {
  try {
    const salonId = staffSalonIdOrNull(req.user);
    const csv = await appointmentService.exportAppointmentsCsv(req.user.id, req.user.role, salonId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="appointments-${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

const listStaffForAssignment = async (req, res, next) => {
  try {
    const roleNorm = String(req.user.role || '').toLowerCase();
    const salonId =
      roleNorm === ROLE_ADMIN || roleNorm === ROLE_STAFF
        ? requireStaffSalonId(req.user)
        : resolvePublicSalonId(req.query.salonId);
    const staff = await appointmentService.listStaffAssignees(salonId);
    return sendSuccess(res, staff, 'Staff list');
  } catch (error) {
    next(error);
  }
};

const getAvailableSlots = async (req, res, next) => {
  try {
    const { serviceId, date, staffId } = req.query;
    const roleNorm = String(req.user.role || '').toLowerCase();
    const salonId =
      roleNorm === ROLE_CUSTOMER
        ? resolvePublicSalonId(req.query.salonId)
        : requireStaffSalonId(req.user);
    const result = await appointmentService.getAvailableSlots(serviceId, date, staffId || null, salonId);
    return sendSuccess(res, result, 'Available slots retrieved');
  } catch (error) {
    next(error);
  }
};

const listAppointments = async (req, res, next) => {
  try {
    const salonId = staffSalonIdOrNull(req.user);
    const appointments = await appointmentService.listAppointments(req.user.id, req.user.role, salonId);
    return sendSuccess(res, appointments, 'Appointments retrieved');
  } catch (error) {
    next(error);
  }
};

const getAppointment = async (req, res, next) => {
  try {
    const salonId = staffSalonIdOrNull(req.user);
    const appointment = await appointmentService.getAppointment(
      req.params.id,
      req.user.id,
      req.user.role,
      salonId
    );
    return sendSuccess(res, appointment, 'Appointment retrieved');
  } catch (error) {
    next(error);
  }
};

const createAppointment = async (req, res, next) => {
  try {
    const body = { ...req.body };
    const customerUserIdRaw = body.customerUserId;
    delete body.customerUserId;

    const roleNorm = String(req.user.role || '').toLowerCase();
    let appointmentUserId = req.user.id;

    if (roleNorm === ROLE_CUSTOMER) {
      appointmentUserId = req.user.id;
    } else if (roleNorm === ROLE_ADMIN || roleNorm === ROLE_STAFF) {
      const explicit = typeof customerUserIdRaw === 'string' ? customerUserIdRaw.trim() : '';
      if (explicit) {
        const u = await User.findByPk(explicit, { attributes: ['id'] });
        if (!u) {
          return sendBadRequest(res, 'customerUserId does not match an existing account.');
        }
        appointmentUserId = u.id;
      } else if (body.customerEmail) {
        const emailNorm = String(body.customerEmail).trim().toLowerCase();
        const customers = await User.findAll({
          where: { email: emailNorm, role: ROLE_CUSTOMER },
          attributes: ['id'],
          limit: CUSTOMER_EMAIL_MATCH_LIMIT,
        });
        if (customers.length === 1) {
          appointmentUserId = customers[0].id;
        }
      }
    }

    const appointment = await appointmentService.createAppointment({
      userId: appointmentUserId,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorSalonId: req.user.salonId || null,
      ...body,
    });
    return sendCreated(res, appointment, 'Appointment created successfully');
  } catch (error) {
    next(error);
  }
};

const updateAppointment = async (req, res, next) => {
  try {
    const salonId = staffSalonIdOrNull(req.user);
    const appointment = await appointmentService.updateAppointment(
      req.params.id,
      req.user.id,
      req.user.role,
      req.body,
      salonId
    );
    return sendSuccess(res, appointment, 'Appointment updated successfully');
  } catch (error) {
    next(error);
  }
};

const cancelAppointment = async (req, res, next) => {
  try {
    const salonId = staffSalonIdOrNull(req.user);
    const appointment = await appointmentService.cancelAppointment(
      req.params.id,
      req.user.id,
      req.user.role,
      salonId
    );
    return sendSuccess(res, appointment, 'Appointment cancelled');
  } catch (error) {
    next(error);
  }
};

// ─── Exports ───

export {
  exportAppointmentsCsv,
  listStaffForAssignment,
  getAvailableSlots,
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  cancelAppointment,
};
