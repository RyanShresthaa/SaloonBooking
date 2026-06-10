import express from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';
import * as staffTimeOffController from '../controllers/StaffTimeOffController.js';

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', staffTimeOffController.listStaffTimeOff);

router.post(
  '/',
  [
    body('userId').isUUID().withMessage('userId is required'),
    body('startDate').isDate().withMessage('startDate must be YYYY-MM-DD'),
    body('endDate').isDate().withMessage('endDate must be YYYY-MM-DD'),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  staffTimeOffController.createStaffTimeOff
);

router.delete('/:id', [param('id').isUUID()], validate, staffTimeOffController.deleteStaffTimeOff);

export default router;
