import express from 'express';
import * as notificationController from '../controllers/NotificationController.js';
import { authenticate, authorize } from '../middlewares/AuthMiddleware.js';
import upload from '../middlewares/UploadMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Bulk appointment notifications and logs
 */

router.use(authenticate);

/**
 * @swagger
 * /notifications/bulk-batches:
 *   get:
 *     summary: Recent bulk-send batches (admin/staff see all; customers see batches that included their email)
 */
router.get('/bulk-batches', notificationController.listBulkBatches);

/**
 * @swagger
 * /notifications/bulk:
 *   post:
 *     summary: Upload Excel file to send bulk appointment confirmations
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, templateId]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               templateId:
 *                 type: string
 *     responses:
 *       202:
 *         description: Bulk job queued. Track via socket.
 *       400:
 *         description: Invalid file or missing templateId.
 */
router.post(
  '/bulk',
  authorize('admin', 'staff'),
  upload.single('file'),
  notificationController.bulkNotify
);

router.post('/reminder', authorize('admin'), notificationController.sendReminderEmail);

router.post('/logs/:id/mark-finished', authorize('admin'), notificationController.markBookingFinished);

router.post('/logs/:id/approve', authorize('admin'), notificationController.approveNotificationLog);
router.post('/logs/:id/decline', authorize('admin'), notificationController.declineNotificationLog);
router.post(
  '/batches/:batchId/approve-all',
  authorize('admin'),
  notificationController.approveAllInBatch
);

/**
 * @swagger
 * /notifications/logs:
 *   get:
 *     summary: "Get notification logs — admin sees all; others own recipient email; staff may read a full batch when batchId is set"
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *         description: Filter logs by batch ID
 *     responses:
 *       200:
 *         description: List of notification logs.
 */
router.get('/logs', notificationController.getLogs);

export default router;
