import { Sequelize } from 'sequelize';
import env from '../config/Env.js';
import logger from '../utils/Logger.js';
import UserModel from './UserModel.js';
import ServiceModel from './ServiceModel.js';
import AppointmentModel from './AppointmentModel.js';
import NotificationTemplateModel from './NotificationTemplateModel.js';
import NotificationLogModel from './NotificationLogModel.js';
import WaitlistEntryModel from './WaitlistEntryModel.js';
import VisitFeedbackModel from './VisitFeedbackModel.js';
import RetailProductModel from './RetailProductModel.js';
import AuditLogModel from './AuditLogModel.js';
import SalonResourceModel from './SalonResourceModel.js';
import StaffTimeOffModel from './StaffTimeOffModel.js';

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  logging: false,
});

const User = UserModel(sequelize);
const Service = ServiceModel(sequelize);
const Appointment = AppointmentModel(sequelize);
const NotificationTemplate = NotificationTemplateModel(sequelize);
const NotificationLog = NotificationLogModel(sequelize);
const WaitlistEntry = WaitlistEntryModel(sequelize);
const VisitFeedback = VisitFeedbackModel(sequelize);
const RetailProduct = RetailProductModel(sequelize);
const AuditLog = AuditLogModel(sequelize);
const SalonResource = SalonResourceModel(sequelize);
const StaffTimeOff = StaffTimeOffModel(sequelize);

User.hasMany(Appointment, { foreignKey: 'userId', as: 'appointments' });
Appointment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Appointment, { foreignKey: 'assignedStaffId', as: 'staffAssignments' });
Appointment.belongsTo(User, { foreignKey: 'assignedStaffId', as: 'assignedStaff' });

Service.hasMany(Appointment, { foreignKey: 'serviceId', as: 'appointments' });
Appointment.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

SalonResource.hasMany(Service, { foreignKey: 'resourceId', as: 'services' });
Service.belongsTo(SalonResource, { foreignKey: 'resourceId', as: 'salonResource' });
SalonResource.hasMany(Appointment, { foreignKey: 'resourceId', as: 'resourceAppointments' });
Appointment.belongsTo(SalonResource, { foreignKey: 'resourceId', as: 'salonResource' });

User.hasMany(StaffTimeOff, { foreignKey: 'userId', as: 'staffTimeOffs' });
StaffTimeOff.belongsTo(User, { foreignKey: 'userId', as: 'staffMember' });

Appointment.hasMany(NotificationLog, { foreignKey: 'appointmentId', as: 'logs' });
NotificationLog.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' });

NotificationTemplate.hasMany(NotificationLog, { foreignKey: 'templateId', as: 'logs' });
NotificationLog.belongsTo(NotificationTemplate, { foreignKey: 'templateId', as: 'template' });

User.hasMany(NotificationLog, { foreignKey: 'sentByUserId', as: 'sentNotificationLogs' });
NotificationLog.belongsTo(User, { foreignKey: 'sentByUserId', as: 'sentBy' });

User.hasMany(WaitlistEntry, { foreignKey: 'userId', as: 'waitlistEntries' });
WaitlistEntry.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Service.hasMany(WaitlistEntry, { foreignKey: 'serviceId', as: 'waitlistEntries' });
WaitlistEntry.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

Appointment.hasOne(VisitFeedback, { foreignKey: 'appointmentId', as: 'feedback' });
VisitFeedback.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' });
User.hasMany(VisitFeedback, { foreignKey: 'userId', as: 'visitFeedbacks' });
VisitFeedback.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(AuditLog, { foreignKey: 'actorUserId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'actorUserId', as: 'actor' });

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connected');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

export {
  sequelize,
  connectDB,
  User,
  Service,
  Appointment,
  NotificationTemplate,
  NotificationLog,
  WaitlistEntry,
  VisitFeedback,
  RetailProduct,
  AuditLog,
  SalonResource,
  StaffTimeOff,
};
