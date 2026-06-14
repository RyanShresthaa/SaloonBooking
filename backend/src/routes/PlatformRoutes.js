import express from 'express';
import { param, body } from 'express-validator';
import { authenticate, authorize } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';
import * as platformController from '../controllers/PlatformController.js';
import * as catalogController from '../controllers/PlatformCatalogController.js';

const router = express.Router();

router.use(authenticate, authorize('super_admin'));

router.get('/analytics', platformController.analytics);
router.get('/salons', platformController.listSalons);
router.patch(
  '/salons/:id',
  [param('id').isUUID()],
  validate,
  platformController.patchSalon
);
router.get('/users', platformController.listUsers);
router.patch(
  '/users/:id',
  [param('id').isUUID()],
  validate,
  platformController.patchUser
);

router.get('/categories', catalogController.listCategories);
router.post(
  '/categories',
  [body('name').trim().notEmpty(), body('slug').trim().notEmpty()],
  validate,
  catalogController.createCategory
);
router.patch('/categories/:id', [param('id').isUUID()], validate, catalogController.patchCategory);
router.delete('/categories/:id', [param('id').isUUID()], validate, catalogController.deleteCategory);

router.get('/banners', catalogController.listBanners);
router.post(
  '/banners',
  [body('title').trim().notEmpty(), body('imageUrl').trim().notEmpty()],
  validate,
  catalogController.createBanner
);
router.patch('/banners/:id', [param('id').isUUID()], validate, catalogController.patchBanner);
router.delete('/banners/:id', [param('id').isUUID()], validate, catalogController.deleteBanner);

export default router;
