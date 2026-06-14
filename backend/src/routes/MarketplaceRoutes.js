import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorizeAny } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';
import * as marketplaceSalonController from '../controllers/MarketplaceSalonController.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/apply',
  [
    body('name').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('addressLine1').trim().notEmpty(),
    body('city').trim().notEmpty(),
    body('country').optional().isLength({ min: 2, max: 2 }),
  ],
  validate,
  marketplaceSalonController.apply
);

router.get('/mine', marketplaceSalonController.mine);

router.get('/listing', authorizeAny('admin', 'staff'), marketplaceSalonController.getTenantListing);
router.patch('/listing', authorizeAny('admin', 'staff'), marketplaceSalonController.patchTenantListing);

export default router;
