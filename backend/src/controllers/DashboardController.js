import dashboardService from '../services/DashboardService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { requireStaffSalonId } from '../utils/salonScope.js';

// ─── Handlers ───

const summary = async (req, res, next) => {
  try {
    let salonId = null;
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      salonId = requireStaffSalonId(req.user);
    }
    const data = await dashboardService.summary(req.user.id, req.user.role, salonId);
    return sendSuccess(res, data, 'Dashboard summary');
  } catch (error) {
    next(error);
  }
};

// ─── Exports ───

export { summary };
