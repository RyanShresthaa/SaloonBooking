import staffTimeOffService from '../services/StaffTimeOffService.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { requireStaffSalonId } from '../utils/salonScope.js';

// ─── Handlers ───

const listStaffTimeOff = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const rows = await staffTimeOffService.list(salonId);
    return sendSuccess(res, rows, 'Staff time off');
  } catch (error) {
    next(error);
  }
};

const createStaffTimeOff = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const row = await staffTimeOffService.create({
      userId: req.body.userId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      reason: req.body.reason,
      salonId,
    });
    return sendCreated(res, row, 'Time off created');
  } catch (error) {
    next(error);
  }
};

const deleteStaffTimeOff = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    await staffTimeOffService.remove(req.params.id, salonId);
    return sendSuccess(res, null, 'Time off removed');
  } catch (error) {
    next(error);
  }
};

// ─── Exports ───

export { listStaffTimeOff, createStaffTimeOff, deleteStaffTimeOff };
