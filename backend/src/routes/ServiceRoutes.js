import express from 'express';
import { body, query } from 'express-validator';
import * as serviceController from '../controllers/ServiceController.js';
import { authenticate, authorize } from '../middlewares/AuthMiddleware.js';
import { optionalAuthenticate } from '../middlewares/OptionalAuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Salon services management
 */

/**
 * @swagger
 * /services:
 *   get:
 *     summary: List all active services
 *     tags: [Services]
 *     security: []
 *     responses:
 *       200:
 *         description: List of services.
 */
router.get(
  '/',
  optionalAuthenticate,
  [query('salonId').optional().isUUID().withMessage('salonId must be a UUID')],
  validate,
  serviceController.listServices
);

/**
 * @swagger
 * /services/{id}:
 *   get:
 *     summary: Get a single service
 *     tags: [Services]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service details.
 *       404:
 *         description: Not found.
 */
router.get(
  '/:id',
  optionalAuthenticate,
  [query('salonId').optional().isUUID().withMessage('salonId must be a UUID')],
  validate,
  serviceController.getService
);

router.use(authenticate, authorize('admin'));

/**
 * @swagger
 * /services:
 *   post:
 *     summary: Create a new service (admin only)
 *     tags: [Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, duration, price]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               duration:
 *                 type: integer
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Service created.
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Service name is required'),
    body('duration').isInt({ min: 15 }).withMessage('Duration must be at least 15 minutes'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('bufferBeforeMinutes').optional().isInt({ min: 0, max: 120 }),
    body('bufferAfterMinutes').optional().isInt({ min: 0, max: 120 }),
    body('resourceId').optional().isUUID(),
  ],
  validate,
  serviceController.createService
);

/**
 * @swagger
 * /services/{id}:
 *   put:
 *     summary: Update a service (admin only)
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Service updated.
 */
router.put('/:id', serviceController.updateService);

/**
 * @swagger
 * /services/{id}:
 *   delete:
 *     summary: Delete a service (admin only)
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service deleted.
 */
router.delete('/:id', serviceController.deleteService);

export default router;
