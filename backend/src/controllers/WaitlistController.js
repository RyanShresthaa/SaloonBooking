import waitlistService from '../services/WaitlistService.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { requireStaffSalonId } from '../utils/salonScope.js';

// ─── Handlers ───

const listWaitlist = async (req, res, next) => {
  try {
    let salonId = null;
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      salonId = requireStaffSalonId(req.user);
    }
    const rows = await waitlistService.list(req.user.id, req.user.role, salonId);
    return sendSuccess(res, rows, 'Waitlist retrieved');
  } catch (error) {
    next(error);
  }
};

const createWaitlist = async (req, res, next) => {
  try {
    const row = await waitlistService.create({
      userId: req.user.id,
      serviceId: req.body.serviceId,
      preferredDate: req.body.preferredDate,
      phone: req.body.phone,
      notes: req.body.notes,
    });
    return sendCreated(res, row, 'Added to waitlist');
  } catch (error) {
    next(error);
  }
};

const updateWaitlist = async (req, res, next) => {
  try {
    let salonId = null;
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      salonId = requireStaffSalonId(req.user);
    }
    const row = await waitlistService.updateStatus(
      req.params.id,
      req.body.status,
      req.user.id,
      req.user.role,
      salonId
    );
    return sendSuccess(res, row, 'Waitlist updated');
  } catch (error) {
    next(error);
  }
};

// ─── Exports ───

export { listWaitlist, createWaitlist, updateWaitlist };
