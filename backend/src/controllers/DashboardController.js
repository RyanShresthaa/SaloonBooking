import dashboardService from '../services/DashboardService.js';
import { sendSuccess } from '../utils/apiResponse.js';

const summary = async (req, res, next) => {
  try {
    const data = await dashboardService.summary(req.user.id, req.user.role);
    return sendSuccess(res, data, 'Dashboard summary');
  } catch (error) {
    next(error);
  }
};

export { summary };
