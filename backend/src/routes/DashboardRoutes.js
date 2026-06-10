import express from 'express';
import { authenticate } from '../middlewares/AuthMiddleware.js';
import * as dashboardController from '../controllers/DashboardController.js';

const router = express.Router();

router.get('/summary', authenticate, dashboardController.summary);

export default router;
