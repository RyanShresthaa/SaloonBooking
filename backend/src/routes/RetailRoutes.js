import express from 'express';
import { body, query } from 'express-validator';
import { authenticate, authorize } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';
import * as retailProductController from '../controllers/RetailProductController.js';

const router = express.Router();

router.get(
  '/',
  [query('salonId').optional().isUUID().withMessage('salonId must be a UUID')],
  validate,
  authenticate,
  retailProductController.listRetail
);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('name is required'),
    body('description').optional().isString(),
    body('price').isFloat({ min: 0 }).withMessage('price must be a positive number'),
    body('stockQty').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  retailProductController.createRetail
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().isString(),
    body('price').optional().isFloat({ min: 0 }),
    body('stockQty').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  retailProductController.updateRetail
);

router.delete('/:id', authenticate, authorize('admin'), retailProductController.deleteRetail);

export default router;
