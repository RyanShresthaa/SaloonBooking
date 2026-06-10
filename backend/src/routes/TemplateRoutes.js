import express from 'express';
import * as templateController from '../controllers/TemplateController.js';
import { authenticate, authorize } from '../middlewares/AuthMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Templates
 *   description: Notification template management
 */

router.use(authenticate);

/**
 * @swagger
 * /templates:
 *   get:
 *     summary: List all notification templates
 *     tags: [Templates]
 *     responses:
 *       200:
 *         description: List of templates.
 */
router.get('/', templateController.listTemplates);

/**
 * @swagger
 * /templates/{id}:
 *   get:
 *     summary: Get a single template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template details.
 */
router.get('/:id', templateController.getTemplate);

router.post('/', authorize('admin'), templateController.createTemplate);
router.put('/:id', authorize('admin'), templateController.updateTemplate);
router.delete('/:id', authorize('admin'), templateController.deleteTemplate);

export default router;
