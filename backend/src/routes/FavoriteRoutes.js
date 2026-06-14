import express from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';
import * as favoriteController from '../controllers/FavoriteController.js';

const router = express.Router();

router.use(authenticate, authorize('customer'));

router.get('/', favoriteController.listMine);
router.post(
  '/',
  [body('marketplaceSalonId').isUUID()],
  validate,
  favoriteController.addFavorite
);
router.delete('/:salonId', [param('salonId').isUUID()], validate, favoriteController.removeFavorite);

export default router;
