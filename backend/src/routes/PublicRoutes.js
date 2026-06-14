import express from 'express';
import { query, param } from 'express-validator';
import validate from '../middlewares/ValidateMiddleware.js';
import * as publicController from '../controllers/PublicController.js';
import * as salonReviewController from '../controllers/SalonReviewController.js';

const router = express.Router();

router.get('/platform/banners', publicController.listPublicBanners);
router.get('/platform/categories', publicController.listPublicCategories);
router.get(
  '/promos/validate',
  [query('code').notEmpty(), query('salonId').isUUID()],
  validate,
  publicController.validatePromoPublic
);

router.get(
  '/marketplace/salons',
  [
    query('city').optional().isString(),
    query('region').optional().isString(),
    query('q').optional().isString(),
    query('serviceQ').optional().isString().isLength({ max: 160 }),
    query('platformCategoryId').optional().isUUID(),
    query('minPrice').optional().isFloat(),
    query('maxPrice').optional().isFloat(),
    query('minRating').optional().isFloat({ min: 0, max: 5 }),
    query('sort')
      .optional()
      .isIn([
        'name',
        'featured',
        'sponsored',
        'price_asc',
        'price_desc',
        'rating',
        'reviews',
        'popularity',
      ]),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validate,
  publicController.listMarketplaceSalons
);

router.get(
  '/marketplace/salons/:slug/reviews',
  [param('slug').trim().notEmpty()],
  validate,
  salonReviewController.listBySlug
);

router.get(
  '/marketplace/salons/:slug/services',
  [param('slug').trim().notEmpty()],
  validate,
  publicController.listServicesBySalonSlug
);

router.get(
  '/marketplace/salons/:slug',
  [
    param('slug').trim().notEmpty(),
    query('includeServices').optional().isIn(['0', '1', 'true', 'false', 'yes', 'no']),
  ],
  validate,
  publicController.getMarketplaceSalonBySlug
);

router.get(
  '/marketplace/salons/:slug/available-slots',
  [
    param('slug').trim().notEmpty(),
    query('serviceId').notEmpty().withMessage('serviceId is required'),
    query('date').isDate().withMessage('Valid date is required (YYYY-MM-DD)'),
    query('staffId').optional().isUUID().withMessage('staffId must be a UUID'),
  ],
  validate,
  publicController.getAvailableSlotsBySalonSlug
);

router.get(
  '/services',
  [query('salonId').optional().isUUID().withMessage('salonId must be a UUID')],
  validate,
  publicController.listServicesPublic
);

router.get(
  '/available-slots',
  [
    query('serviceId').notEmpty().withMessage('serviceId is required'),
    query('date').isDate().withMessage('Valid date is required (YYYY-MM-DD)'),
    query('staffId').optional().isUUID().withMessage('staffId must be a UUID'),
    query('salonId').optional().isUUID().withMessage('salonId must be a UUID'),
  ],
  validate,
  publicController.getAvailableSlotsPublic
);

export default router;
