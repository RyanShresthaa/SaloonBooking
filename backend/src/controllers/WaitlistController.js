import waitlistService from '../services/WaitlistService.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

const listWaitlist = async (req, res, next) => {
  try {
    const rows = await waitlistService.list(req.user.id, req.user.role);
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
    const row = await waitlistService.updateStatus(req.params.id, req.body.status, req.user.id, req.user.role);
    return sendSuccess(res, row, 'Waitlist updated');
  } catch (error) {
    next(error);
  }
};

export { listWaitlist, createWaitlist, updateWaitlist };
