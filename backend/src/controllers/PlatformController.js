import { Op } from 'sequelize';
import {
  MarketplaceSalon,
  User,
  Appointment,
  SalonReview,
  AuditLog,
} from '../models/Index.js';
import { sendSuccess, sendNotFound, sendForbidden, sendBadRequest } from '../utils/apiResponse.js';

const listSalons = async (req, res, next) => {
  try {
    const { rows, count } = await MarketplaceSalon.findAndCountAll({
      order: [['updatedAt', 'DESC']],
      limit: Math.min(Number(req.query.limit) || 100, 200),
      offset: Number(req.query.offset) || 0,
    });
    return sendSuccess(res, { rows, count }, 'All salons');
  } catch (e) {
    next(e);
  }
};

const patchSalon = async (req, res, next) => {
  try {
    const row = await MarketplaceSalon.findByPk(req.params.id);
    if (!row) return sendNotFound(res, 'Salon not found');
    const {
      suspendedAt,
      verifiedAt,
      featuredRank,
      sponsoredRank,
      listingStatus,
      adminReviewNotes,
    } = req.body || {};
    const patch = {};
    if (suspendedAt !== undefined) patch.suspendedAt = suspendedAt ? new Date(suspendedAt) : null;
    if (verifiedAt !== undefined) patch.verifiedAt = verifiedAt ? new Date(verifiedAt) : null;
    if (featuredRank !== undefined) patch.featuredRank = featuredRank === null ? null : Number(featuredRank);
    if (sponsoredRank !== undefined) patch.sponsoredRank = sponsoredRank === null ? null : Number(sponsoredRank);
    if (listingStatus !== undefined) {
      const ok = ['pending', 'approved', 'rejected', 'changes_requested'].includes(listingStatus);
      if (!ok) return sendBadRequest(res, 'Invalid listingStatus');
      patch.listingStatus = listingStatus;
    }
    if (adminReviewNotes !== undefined) patch.adminReviewNotes = adminReviewNotes;
    await row.update(patch);
    return sendSuccess(res, row, 'Salon updated');
  } catch (e) {
    next(e);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const where = {};
    if (q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } },
      ];
    }
    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: Math.min(Number(req.query.limit) || 50, 100),
      offset: Number(req.query.offset) || 0,
    });
    return sendSuccess(res, { rows, count }, 'Users');
  } catch (e) {
    next(e);
  }
};

const patchUser = async (req, res, next) => {
  try {
    const row = await User.findByPk(req.params.id);
    if (!row) return sendNotFound(res, 'User not found');
    if (row.role === 'super_admin' && req.user.id !== row.id) {
      return sendForbidden(res, 'Cannot modify another super admin.');
    }
    const { bannedAt, role } = req.body || {};
    const patch = {};
    if (bannedAt !== undefined) patch.bannedAt = bannedAt ? new Date(bannedAt) : null;
    if (role !== undefined) {
      const allowed = ['customer', 'staff', 'admin', 'super_admin'];
      if (!allowed.includes(role)) return sendBadRequest(res, 'Invalid role');
      if (role === 'super_admin' && req.user.id !== row.id) {
        return sendForbidden(res, 'Cannot promote others to super_admin from this endpoint.');
      }
      patch.role = role;
    }
    await row.update(patch);
    await row.reload({ attributes: { exclude: ['password'] } });
    return sendSuccess(res, row, 'User updated');
  } catch (e) {
    next(e);
  }
};

const analytics = async (req, res, next) => {
  try {
    const [salonCount, customerCount, staffCount, appointmentCount, reviewCount, auditCount] = await Promise.all([
      MarketplaceSalon.count(),
      User.count({ where: { role: 'customer' } }),
      User.count({ where: { role: { [Op.in]: ['staff', 'admin'] } } }),
      Appointment.count(),
      SalonReview.count({ where: { status: 'published' } }),
      AuditLog.count(),
    ]);
    return sendSuccess(
      res,
      {
        salons: salonCount,
        customers: customerCount,
        staffAndAdmins: staffCount,
        appointments: appointmentCount,
        publishedReviews: reviewCount,
        auditLogRows: auditCount,
      },
      'Platform analytics'
    );
  } catch (e) {
    next(e);
  }
};

export { listSalons, patchSalon, listUsers, patchUser, analytics };
