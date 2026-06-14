import { SalonReview, MarketplaceSalon, User } from '../models/Index.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest } from '../utils/apiResponse.js';
import marketplaceSalonService from '../services/MarketplaceSalonService.js';

const listBySlug = async (req, res, next) => {
  try {
    const row = await marketplaceSalonService.getPublicBySlug(req.params.slug);
    if (!row) return sendNotFound(res, 'Salon not found');
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Number(req.query.offset) || 0;
    const { rows, count } = await SalonReview.findAndCountAll({
      where: { marketplaceSalonId: row.id, status: 'published' },
      include: [{ model: User, as: 'author', attributes: ['id', 'name'], required: false }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    return sendSuccess(res, { reviews: rows, count }, 'Reviews');
  } catch (e) {
    next(e);
  }
};

const createReview = async (req, res, next) => {
  try {
    if (req.user.role !== 'customer') {
      return sendBadRequest(res, 'Only customer accounts can post public reviews.');
    }
    const { marketplaceSalonId, rating, title, body, photos } = req.body || {};
    const sid = String(marketplaceSalonId || '').trim();
    const r = Number(rating);
    if (!sid) return sendBadRequest(res, 'marketplaceSalonId is required');
    if (Number.isNaN(r) || r < 1 || r > 5) return sendBadRequest(res, 'rating must be 1–5');
    const salon = await MarketplaceSalon.findByPk(sid);
    if (!salon || salon.listingStatus !== 'approved' || salon.suspendedAt) {
      return sendNotFound(res, 'Salon not found');
    }
    const review = await SalonReview.create({
      marketplaceSalonId: sid,
      userId: req.user.id,
      rating: r,
      title: title ? String(title).slice(0, 200) : null,
      body: body ? String(body) : null,
      photos: Array.isArray(photos) ? photos : [],
      status: 'published',
    });
    return sendCreated(res, review, 'Review posted');
  } catch (e) {
    next(e);
  }
};

export { listBySlug, createReview };
