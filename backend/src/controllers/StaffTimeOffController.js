import staffTimeOffService from '../services/StaffTimeOffService.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

const listStaffTimeOff = async (req, res, next) => {
  try {
    const rows = await staffTimeOffService.list();
    return sendSuccess(res, rows, 'Staff time off');
  } catch (e) {
    next(e);
  }
};

const createStaffTimeOff = async (req, res, next) => {
  try {
    const row = await staffTimeOffService.create({
      userId: req.body.userId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      reason: req.body.reason,
    });
    return sendCreated(res, row, 'Time off created');
  } catch (e) {
    next(e);
  }
};

const deleteStaffTimeOff = async (req, res, next) => {
  try {
    await staffTimeOffService.remove(req.params.id);
    return sendSuccess(res, null, 'Time off removed');
  } catch (e) {
    next(e);
  }
};

export { listStaffTimeOff, createStaffTimeOff, deleteStaffTimeOff };
