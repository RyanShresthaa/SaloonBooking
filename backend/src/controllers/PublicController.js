import { Service, PlatformHomeBanner, PlatformServiceCategory, PromoCode } from '../models/Index.js';
import appointmentService from '../services/AppointmentService.js';
import marketplaceSalonService from '../services/MarketplaceSalonService.js';
import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/apiResponse.js';
import { resolvePublicSalonId } from '../utils/salonScope.js';

// ─── Constants ───

const PUBLIC_SERVICE_ATTRIBUTES = [
  'id',
  'name',
  'description',
  'duration',
  'price',
  'discountPrice',
  'bufferBeforeMinutes',
  'bufferAfterMinutes',
  'genderTag',
  'platformCategoryId',
  'imageUrls',
];

function wantsIncludeServices(query) {
  const v = String(query?.includeServices ?? '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function findActiveServicesBySalonId(salonId) {
  return Service.findAll({
    where: { isActive: true, salonId },
    attributes: PUBLIC_SERVICE_ATTRIBUTES,
    order: [['name', 'ASC']],
  });
}

// ─── Handlers ───

/** Anonymous-friendly listing for embeddable booking widgets (scoped by salon). */
const listServicesPublic = async (req, res, next) => {
  try {
    const salonId = resolvePublicSalonId(req.query.salonId);
    const services = await findActiveServicesBySalonId(salonId);
    return sendSuccess(res, services, 'Services retrieved');
  } catch (error) {
    next(error);
  }
};

const getAvailableSlotsPublic = async (req, res, next) => {
  try {
    const { serviceId, date, staffId } = req.query;
    const salonId = resolvePublicSalonId(req.query.salonId);
    const result = await appointmentService.getAvailableSlots(serviceId, date, staffId || null, salonId);
    return sendSuccess(res, result, 'Available slots retrieved');
  } catch (error) {
    next(error);
  }
};

const listMarketplaceSalons = async (req, res, next) => {
  try {
    const {
      city,
      region,
      q,
      minPrice,
      maxPrice,
      limit,
      offset,
      sort,
      serviceQ,
      platformCategoryId,
      minRating,
    } = req.query;
    const { rows, count } = await marketplaceSalonService.listPublicApproved({
      city,
      region,
      q,
      minPrice,
      maxPrice,
      serviceQ,
      platformCategoryId,
      minRating,
      limit,
      offset,
      sort: sort || 'name',
    });
    const salons = rows.map((r) => marketplaceSalonService.toPublicCard(r));
    return sendSuccess(res, { salons, count }, 'Salons retrieved');
  } catch (error) {
    next(error);
  }
};

const getMarketplaceSalonBySlug = async (req, res, next) => {
  try {
    const plain = await marketplaceSalonService.getEnrichedPublicPlainBySlug(req.params.slug);
    if (!plain) return sendNotFound(res, 'Salon not found');
    const detail = marketplaceSalonService.toPublicDetail(plain);
    if (wantsIncludeServices(req.query)) {
      const services = await findActiveServicesBySalonId(plain.id);
      return sendSuccess(res, { ...detail, services }, 'Salon profile');
    }
    return sendSuccess(res, detail, 'Salon profile');
  } catch (error) {
    next(error);
  }
};

const listServicesBySalonSlug = async (req, res, next) => {
  try {
    const row = await marketplaceSalonService.getPublicBySlug(req.params.slug);
    if (!row) return sendNotFound(res, 'Salon not found');
    const services = await findActiveServicesBySalonId(row.id);
    return sendSuccess(res, { salonId: row.id, services }, 'Services retrieved');
  } catch (error) {
    next(error);
  }
};

const getAvailableSlotsBySalonSlug = async (req, res, next) => {
  try {
    const { serviceId, date, staffId } = req.query;
    const row = await marketplaceSalonService.getPublicBySlug(req.params.slug);
    if (!row) return sendNotFound(res, 'Salon not found');
    const svc = await Service.findByPk(serviceId);
    if (!svc || String(svc.salonId) !== String(row.id)) {
      return sendBadRequest(res, 'serviceId does not belong to this salon');
    }
    const result = await appointmentService.getAvailableSlots(serviceId, date, staffId || null, row.id);
    return sendSuccess(res, result, 'Available slots retrieved');
  } catch (error) {
    next(error);
  }
};

const listPublicBanners = async (req, res, next) => {
  try {
    const rows = await PlatformHomeBanner.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC']],
    });
    const now = Date.now();
    const filtered = rows.filter((b) => {
      if (b.startsAt && new Date(b.startsAt).getTime() > now) return false;
      if (b.endsAt && new Date(b.endsAt).getTime() < now) return false;
      return true;
    });
    return sendSuccess(res, filtered, 'Banners');
  } catch (e) {
    next(e);
  }
};

const listPublicCategories = async (req, res, next) => {
  try {
    const rows = await PlatformServiceCategory.findAll({
      order: [
        ['sortOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    });
    return sendSuccess(res, rows, 'Categories');
  } catch (e) {
    next(e);
  }
};

const validatePromoPublic = async (req, res, next) => {
  try {
    const code = String(req.query.code || '').trim().toUpperCase();
    const salonId = String(req.query.salonId || '').trim();
    if (!code || !salonId) return sendBadRequest(res, 'code and salonId are required');
    const row = await PromoCode.findOne({ where: { salonId, code, isActive: true } });
    if (!row) return sendNotFound(res, 'Promo not found');
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
      return sendBadRequest(res, 'Promo expired');
    }
    if (row.maxUses != null && row.usesCount >= row.maxUses) {
      return sendBadRequest(res, 'Promo fully redeemed');
    }
    return sendSuccess(res, { discountType: row.discountType, amount: row.amount }, 'Promo valid');
  } catch (e) {
    next(e);
  }
};

// ─── Exports ───

export {
  listServicesPublic,
  getAvailableSlotsPublic,
  listMarketplaceSalons,
  getMarketplaceSalonBySlug,
  listServicesBySalonSlug,
  getAvailableSlotsBySalonSlug,
  listPublicBanners,
  listPublicCategories,
  validatePromoPublic,
};
