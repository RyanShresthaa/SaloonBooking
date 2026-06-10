import express from 'express';
import rateLimit from 'express-rate-limit';
import authRoutes from './AuthRoutes.js';
import appointmentRoutes from './AppointmentRoutes.js';
import serviceRoutes from './ServiceRoutes.js';
import templateRoutes from './TemplateRoutes.js';
import notificationRoutes from './NotificationRoutes.js';
import dashboardRoutes from './DashboardRoutes.js';
import waitlistRoutes from './WaitlistRoutes.js';
import visitFeedbackRoutes from './VisitFeedbackRoutes.js';
import retailRoutes from './RetailRoutes.js';
import metaRoutes from './MetaRoutes.js';
import auditRoutes from './AuditRoutes.js';
import publicRoutes from './PublicRoutes.js';
import staffRoutes from './StaffRoutes.js';
import billingRoutes from './BillingRoutes.js';

const router = express.Router();

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many public requests from this IP.' },
});

router.use('/public', publicLimiter, publicRoutes);
router.use('/staff', staffRoutes);
router.use('/billing', billingRoutes);

router.use('/meta', metaRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/auth', authRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/services', serviceRoutes);
router.use('/templates', templateRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/waitlist', waitlistRoutes);
router.use('/visit-feedbacks', visitFeedbackRoutes);
router.use('/retail-products', retailRoutes);

export default router;
