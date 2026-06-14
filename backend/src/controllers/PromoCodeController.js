import { PromoCode } from '../models/Index.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest } from '../utils/apiResponse.js';
import { requireStaffSalonId } from '../utils/salonScope.js';

const listPromos = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const rows = await PromoCode.findAll({ where: { salonId }, order: [['createdAt', 'DESC']] });
    return sendSuccess(res, rows, 'Promo codes');
  } catch (e) {
    next(e);
  }
};

const createPromo = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const b = req.body || {};
    const code = String(b.code || '').trim().toUpperCase();
    if (!code) return sendBadRequest(res, 'code is required');
    const discountType = String(b.discountType || 'percent').toLowerCase();
    if (!['percent', 'fixed'].includes(discountType)) return sendBadRequest(res, 'discountType must be percent or fixed');
    const amount = Number(b.amount);
    if (Number.isNaN(amount) || amount <= 0) return sendBadRequest(res, 'amount must be a positive number');
    const row = await PromoCode.create({
      salonId,
      code,
      discountType,
      amount,
      maxUses: b.maxUses != null ? Number(b.maxUses) : null,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
      isActive: b.isActive !== false,
    });
    return sendCreated(res, row, 'Promo created');
  } catch (e) {
    next(e);
  }
};

const patchPromo = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const row = await PromoCode.findByPk(req.params.id);
    if (!row || String(row.salonId) !== String(salonId)) return sendNotFound(res, 'Promo not found');
    await row.update(req.body || {});
    return sendSuccess(res, row, 'Updated');
  } catch (e) {
    next(e);
  }
};

const deletePromo = async (req, res, next) => {
  try {
    const salonId = requireStaffSalonId(req.user);
    const row = await PromoCode.findByPk(req.params.id);
    if (!row || String(row.salonId) !== String(salonId)) return sendNotFound(res, 'Promo not found');
    await row.destroy();
    return sendSuccess(res, null, 'Deleted');
  } catch (e) {
    next(e);
  }
};

export { listPromos, createPromo, patchPromo, deletePromo };
