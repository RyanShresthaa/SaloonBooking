import { CustomerFavorite, MarketplaceSalon } from '../models/Index.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest } from '../utils/apiResponse.js';

const listMine = async (req, res, next) => {
  try {
    const rows = await CustomerFavorite.findAll({
      where: { userId: req.user.id },
      include: [{ model: MarketplaceSalon, as: 'salon', required: true }],
      order: [['createdAt', 'DESC']],
    });
    return sendSuccess(res, rows, 'Favorites');
  } catch (e) {
    next(e);
  }
};

const addFavorite = async (req, res, next) => {
  try {
    const marketplaceSalonId = String(req.body?.marketplaceSalonId || '').trim();
    if (!marketplaceSalonId) return sendBadRequest(res, 'marketplaceSalonId is required');
    const salon = await MarketplaceSalon.findByPk(marketplaceSalonId);
    if (!salon || salon.listingStatus !== 'approved') return sendNotFound(res, 'Salon not found');
    const [row, created] = await CustomerFavorite.findOrCreate({
      where: { userId: req.user.id, marketplaceSalonId },
      defaults: { userId: req.user.id, marketplaceSalonId },
    });
    return sendSuccess(res, row, created ? 'Added' : 'Already saved');
  } catch (e) {
    next(e);
  }
};

const removeFavorite = async (req, res, next) => {
  try {
    const marketplaceSalonId = String(req.params.salonId || '').trim();
    const n = await CustomerFavorite.destroy({ where: { userId: req.user.id, marketplaceSalonId } });
    if (!n) return sendNotFound(res, 'Favorite not found');
    return sendSuccess(res, null, 'Removed');
  } catch (e) {
    next(e);
  }
};

export { listMine, addFavorite, removeFavorite };
