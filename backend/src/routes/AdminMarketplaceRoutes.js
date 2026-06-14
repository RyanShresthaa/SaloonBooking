import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorizeAny } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';
import * as adminMarketplaceController from '../controllers/AdminMarketplaceController.js';

const router = express.Router();

router.use(authenticate, authorizeAny('super_admin', 'admin'));

router.get(
  '/',
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'changes_requested']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validate,
  adminMarketplaceController.list
);

router.post('/', adminMarketplaceController.createManual);

router.get('/:id', [param('id').isUUID()], validate, adminMarketplaceController.getOne);

router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('listingStatus').isIn(['pending', 'approved', 'rejected', 'changes_requested']),
    body('adminReviewNotes').optional().isString(),
    body('slug').optional().isString(),
  ],
  validate,
  adminMarketplaceController.moderate
);

router.delete('/:id', [param('id').isUUID()], validate, adminMarketplaceController.remove);

export default router;
