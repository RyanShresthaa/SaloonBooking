import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';
import * as billingController from '../controllers/BillingController.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/deposit-checkout',
  [body('appointmentId').isUUID().withMessage('appointmentId must be a UUID')],
  validate,
  billingController.createDepositCheckout
);

export default router;
