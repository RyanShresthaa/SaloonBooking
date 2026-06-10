import express from 'express';
import { query } from 'express-validator';
import validate from '../middlewares/ValidateMiddleware.js';
import * as publicController from '../controllers/PublicController.js';

const router = express.Router();

router.get('/services', publicController.listServicesPublic);

router.get(
  '/available-slots',
  [
    query('serviceId').notEmpty().withMessage('serviceId is required'),
    query('date').isDate().withMessage('Valid date is required (YYYY-MM-DD)'),
    query('staffId').optional().isUUID().withMessage('staffId must be a UUID'),
  ],
  validate,
  publicController.getAvailableSlotsPublic
);

export default router;
