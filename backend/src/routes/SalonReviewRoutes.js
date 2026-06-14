import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';
import * as salonReviewController from '../controllers/SalonReviewController.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize('customer'),
  [
    body('marketplaceSalonId').isUUID(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('title').optional().isString(),
    body('body').optional().isString(),
  ],
  validate,
  salonReviewController.createReview
);

export default router;
