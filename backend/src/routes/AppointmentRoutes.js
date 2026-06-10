import express from 'express';
import { body, query } from 'express-validator';
import * as appointmentController from '../controllers/AppointmentController.js';
import { authenticate, authorize } from '../middlewares/AuthMiddleware.js';
import validate from '../middlewares/ValidateMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Appointment management and availability
 */

router.use(authenticate);

/**
 * @swagger
 * /appointments/available-slots:
 *   get:
 *     summary: Get available time slots for a service on a given date
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of available time slots.
 */
router.get(
  '/available-slots',
  [
    query('serviceId').notEmpty().withMessage('serviceId is required'),
    query('date').isDate().withMessage('Valid date is required (YYYY-MM-DD)'),
    query('staffId').optional().isUUID().withMessage('staffId must be a UUID'),
  ],
  validate,
  appointmentController.getAvailableSlots
);

router.get('/export.csv', authorize('admin', 'staff'), appointmentController.exportAppointmentsCsv);
router.get('/staff', appointmentController.listStaffForAssignment);

/**
 * @swagger
 * /appointments:
 *   get:
 *     summary: List all appointments
 *     tags: [Appointments]
 *     responses:
 *       200:
 *         description: List of appointments.
 */
router.get('/', appointmentController.listAppointments);

/**
 * @swagger
 * /appointments/{id}:
 *   get:
 *     summary: Get a single appointment
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointment details.
 *       404:
 *         description: Not found.
 */
router.get('/:id', appointmentController.getAppointment);

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Create a new appointment
 *     tags: [Appointments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceId, customerName, customerEmail, appointmentDate, startTime]
 *             properties:
 *               serviceId:
 *                 type: string
 *               customerName:
 *                 type: string
 *               customerEmail:
 *                 type: string
 *               customerPhone:
 *                 type: string
 *               appointmentDate:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 example: "10:00"
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Appointment created.
 *       400:
 *         description: Validation error or slot unavailable.
 */
router.post(
  '/',
  [
    body('serviceId').notEmpty().withMessage('serviceId is required'),
    body('customerName').trim().notEmpty().withMessage('Customer name is required'),
    body('customerEmail').isEmail().withMessage('Valid customer email is required'),
    body('appointmentDate').isDate().withMessage('Valid date is required (YYYY-MM-DD)'),
    body('startTime')
      .matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Start time must be in HH:MM format'),
    body('emailRemindersOptIn').optional().isBoolean().withMessage('emailRemindersOptIn must be true or false'),
    body('assignedStaffId').optional().isUUID().withMessage('assignedStaffId must be a UUID'),
  ],
  validate,
  appointmentController.createAppointment
);

/**
 * @swagger
 * /appointments/{id}:
 *   put:
 *     summary: Update an appointment
 *     tags: [Appointments]
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
 *         description: Appointment updated.
 *       404:
 *         description: Not found.
 */
router.put(
  '/:id',
  [
    body('customerName').optional().trim().notEmpty().withMessage('Customer name cannot be empty'),
    body('customerEmail').optional().isEmail().withMessage('Valid customer email is required'),
    body('appointmentDate').optional().isDate().withMessage('Valid date is required'),
    body('startTime')
      .optional()
      .matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Start time must be in HH:MM format'),
    body('status')
      .optional()
      .isIn(['pending', 'confirmed', 'cancelled', 'completed'])
      .withMessage('Invalid status'),
  ],
  validate,
  appointmentController.updateAppointment
);

/**
 * @swagger
 * /appointments/{id}:
 *   delete:
 *     summary: Cancel an appointment
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointment cancelled.
 *       404:
 *         description: Not found.
 */
router.delete('/:id', appointmentController.cancelAppointment);

export default router;
