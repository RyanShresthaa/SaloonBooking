import express from 'express';
import { query } from 'express-validator';
import { authenticate, authorize } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';
import * as auditController from '../controllers/AuditController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'staff'));

router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('entityType').optional().isString().isLength({ max: 80 }),
  ],
  validate,
  auditController.listAuditLogs
);

export default router;
