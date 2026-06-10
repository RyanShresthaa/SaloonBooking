import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';
import * as waitlistController from '../controllers/WaitlistController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', waitlistController.listWaitlist);

router.post(
  '/',
  [
    body('serviceId').notEmpty().withMessage('serviceId is required'),
    body('preferredDate')
      .optional({ values: 'null' })
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('preferredDate must be YYYY-MM-DD'),
    body('phone').optional().isString(),
    body('notes').optional().isString(),
  ],
  validate,
  waitlistController.createWaitlist
);

router.patch(
  '/:id',
  [body('status').notEmpty().isIn(['pending', 'contacted', 'fulfilled', 'cancelled']).withMessage('Invalid status')],
  validate,
  waitlistController.updateWaitlist
);

export default router;
