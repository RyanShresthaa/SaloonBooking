import express from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';
import * as visitFeedbackController from '../controllers/VisitFeedbackController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', visitFeedbackController.listFeedback);

router.post(
  '/',
  [
    body('appointmentId').notEmpty().withMessage('appointmentId is required'),
    body('rating')
      .custom((value) => {
        const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
        return Number.isInteger(n) && n >= 1 && n <= 5;
      })
      .withMessage('rating must be 1–5'),
    body('comment').optional().isString(),
  ],
  validate,
  visitFeedbackController.createFeedback
);

router.patch(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid feedback id'),
    body('rating')
      .optional()
      .custom((value) => {
        const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
        return Number.isInteger(n) && n >= 1 && n <= 5;
      })
      .withMessage('rating must be 1–5'),
    body('comment').optional({ nullable: true }).isString(),
  ],
  validate,
  visitFeedbackController.updateFeedback
);

router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid feedback id')],
  validate,
  visitFeedbackController.deleteFeedback
);

export default router;
