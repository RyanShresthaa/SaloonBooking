import retailProductService from '../services/RetailProductService.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { requireStaffSalonId, resolvePublicSalonId } from '../utils/salonScope.js';

// ─── Handlers ───

const listRetail = async (req, res, next) => {
  try {
    const role = String(req.user.role || '').toLowerCase();
    let salonId = null;
    if (role === 'admin' || role === 'staff') {
      salonId = requireStaffSalonId(req.user);
    } else {
      salonId = resolvePublicSalonId(req.query.salonId);
    }
    const rows = await retailProductService.list(req.user.role, salonId);
    return sendSuccess(res, rows, 'Products retrieved');
  } catch (error) {
    next(error);
  }
};

const createRetail = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const row = await retailProductService.create(req.body, salonId);
    return sendCreated(res, row, 'Product created');
  } catch (error) {
    next(error);
  }
};

const updateRetail = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const row = await retailProductService.update(req.params.id, req.body, salonId);
    return sendSuccess(res, row, 'Product updated');
  } catch (error) {
    next(error);
  }
};

const deleteRetail = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const result = await retailProductService.remove(req.params.id, salonId);
    return sendSuccess(res, result, 'Product deleted');
  } catch (error) {
    next(error);
  }
};

// ─── Exports ───

export { listRetail, createRetail, updateRetail, deleteRetail };
