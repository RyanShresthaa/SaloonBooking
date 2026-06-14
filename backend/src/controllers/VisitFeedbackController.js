import visitFeedbackService from '../services/VisitFeedbackService.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { requireStaffSalonId } from '../utils/salonScope.js';

// ─── Handlers ───

const listFeedback = async (req, res, next) => {
  try {
    let salonId = null;
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      salonId = requireStaffSalonId(req.user);
    }
    const rows = await visitFeedbackService.list(req.user.id, req.user.role, salonId);
    return sendSuccess(res, rows, 'Feedback retrieved');
  } catch (error) {
    next(error);
  }
};

const createFeedback = async (req, res, next) => {
  try {
    const row = await visitFeedbackService.create(req.user.id, {
      appointmentId: req.body.appointmentId,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    return sendCreated(res, row, 'Thank you for your feedback');
  } catch (error) {
    next(error);
  }
};

const updateFeedback = async (req, res, next) => {
  try {
    const row = await visitFeedbackService.update(req.user.id, req.params.id, {
      rating: req.body.rating,
      comment: req.body.comment,
    });
    return sendSuccess(res, row, 'Review updated');
  } catch (error) {
    next(error);
  }
};

const deleteFeedback = async (req, res, next) => {
  try {
    await visitFeedbackService.remove(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Review removed');
  } catch (error) {
    next(error);
  }
};

// ─── Exports ───

export { listFeedback, createFeedback, updateFeedback, deleteFeedback };
