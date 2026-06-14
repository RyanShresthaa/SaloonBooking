import express from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize, authorizeAny } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';
import staffTimeOffRoutes from './StaffTimeOffRoutes.js';
import * as staffDirectoryController from '../controllers/StaffDirectoryController.js';

import * as promoCodeController from '../controllers/PromoCodeController.js';

const router = express.Router();

router.get('/team', authenticate, authorize('admin'), staffDirectoryController.listTeam);
router.post(
  '/team',
  authenticate,
  authorize('admin'),
  [
    body('name').trim().notEmpty().isLength({ max: 120 }).withMessage('Name is required (max 120 characters).'),
    body('email').trim().isEmail().withMessage('Valid email is required.'),
    body('password').isLength({ min: 6, max: 128 }).withMessage('Password must be 6–128 characters.'),
    body('role').isIn(['staff', 'admin']).withMessage('Role must be staff or admin.'),
    body('speciality').optional().isString().isLength({ max: 500 }),
    body('staffNotes').optional().isString().isLength({ max: 5000 }),
  ],
  validate,
  staffDirectoryController.createStaffMember
);
router.post('/team/seed-demo', authenticate, authorize('admin'), staffDirectoryController.seedDemoStaff);

router.patch(
  '/team/:id',
  authenticate,
  authorize('admin'),
  [
    param('id').isUUID().withMessage('Invalid id'),
    body('name').optional().trim().notEmpty().isLength({ max: 120 }),
    body('email').optional().trim().isEmail(),
    body('role').optional().isIn(['staff', 'admin']),
    body('password').optional({ checkFalsy: true }).isLength({ min: 6, max: 128 }),
  ],
  validate,
  staffDirectoryController.updateStaffMember
);

router.delete(
  '/team/:id',
  authenticate,
  authorize('admin'),
  [param('id').isUUID().withMessage('Invalid id')],
  validate,
  staffDirectoryController.deleteStaffMember
);

router.use('/time-off', staffTimeOffRoutes);

router.get('/promo-codes', authenticate, authorizeAny('admin', 'staff'), promoCodeController.listPromos);
router.post(
  '/promo-codes',
  authenticate,
  authorizeAny('admin', 'staff'),
  [
    body('code').trim().notEmpty(),
    body('discountType').isIn(['percent', 'fixed']),
    body('amount').isFloat({ gt: 0 }),
    body('maxUses').optional().isInt({ min: 1 }),
    body('expiresAt').optional().isString(),
  ],
  validate,
  promoCodeController.createPromo
);
router.patch(
  '/promo-codes/:id',
  authenticate,
  authorizeAny('admin', 'staff'),
  [param('id').isUUID()],
  validate,
  promoCodeController.patchPromo
);
router.delete(
  '/promo-codes/:id',
  authenticate,
  authorizeAny('admin', 'staff'),
  [param('id').isUUID()],
  validate,
  promoCodeController.deletePromo
);

export default router;
