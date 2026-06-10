import express from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';
import staffTimeOffRoutes from './StaffTimeOffRoutes.js';
import * as staffDirectoryController from '../controllers/StaffDirectoryController.js';

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

export default router;
