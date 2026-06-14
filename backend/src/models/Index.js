import { Sequelize } from 'sequelize';
import env from '../config/Env.js';
import { getPostgresDialectOptions } from '../config/postgresSslOptions.js';
import logger from '../utils/Logger.js';
import UserModel from './UserModel.js';
import PlatformServiceCategoryModel from './PlatformServiceCategoryModel.js';
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
import MarketplaceSalonModel from './MarketplaceSalonModel.js';
import PlatformHomeBannerModel from './PlatformHomeBannerModel.js';
import SalonReviewModel from './SalonReviewModel.js';
import CustomerFavoriteModel from './CustomerFavoriteModel.js';
import PromoCodeModel from './PromoCodeModel.js';

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  logging: false,
  ...getPostgresDialectOptions(),
});

const User = UserModel(sequelize);
const PlatformServiceCategory = PlatformServiceCategoryModel(sequelize);
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
const MarketplaceSalon = MarketplaceSalonModel(sequelize);
const PlatformHomeBanner = PlatformHomeBannerModel(sequelize);
const SalonReview = SalonReviewModel(sequelize);
const CustomerFavorite = CustomerFavoriteModel(sequelize);
const PromoCode = PromoCodeModel(sequelize);

Service.belongsTo(PlatformServiceCategory, { foreignKey: 'platformCategoryId', as: 'platformCategory' });
PlatformServiceCategory.hasMany(Service, { foreignKey: 'platformCategoryId', as: 'services' });

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

User.hasMany(MarketplaceSalon, { foreignKey: 'submittedByUserId', as: 'marketplaceSalonSubmissions' });
MarketplaceSalon.belongsTo(User, { foreignKey: 'submittedByUserId', as: 'submittedBy' });
MarketplaceSalon.belongsTo(User, { foreignKey: 'reviewedByUserId', as: 'reviewedBy' });

User.belongsTo(MarketplaceSalon, { foreignKey: 'salonId', as: 'salon' });
MarketplaceSalon.hasMany(User, { foreignKey: 'salonId', as: 'salonUsers' });

MarketplaceSalon.hasMany(Service, { foreignKey: 'salonId', as: 'services' });
Service.belongsTo(MarketplaceSalon, { foreignKey: 'salonId', as: 'salon' });

MarketplaceSalon.hasMany(SalonResource, { foreignKey: 'salonId', as: 'salonResources' });
SalonResource.belongsTo(MarketplaceSalon, { foreignKey: 'salonId', as: 'salon' });

MarketplaceSalon.hasMany(Appointment, { foreignKey: 'salonId', as: 'salonAppointments' });
Appointment.belongsTo(MarketplaceSalon, { foreignKey: 'salonId', as: 'salon' });

MarketplaceSalon.hasMany(WaitlistEntry, { foreignKey: 'salonId', as: 'waitlistEntries' });
WaitlistEntry.belongsTo(MarketplaceSalon, { foreignKey: 'salonId', as: 'salon' });

MarketplaceSalon.hasMany(RetailProduct, { foreignKey: 'salonId', as: 'retailProducts' });
RetailProduct.belongsTo(MarketplaceSalon, { foreignKey: 'salonId', as: 'salon' });

MarketplaceSalon.hasMany(NotificationTemplate, { foreignKey: 'salonId', as: 'notificationTemplates' });
NotificationTemplate.belongsTo(MarketplaceSalon, { foreignKey: 'salonId', as: 'salon' });

MarketplaceSalon.hasMany(StaffTimeOff, { foreignKey: 'salonId', as: 'staffTimeOffs' });
StaffTimeOff.belongsTo(MarketplaceSalon, { foreignKey: 'salonId', as: 'salon' });

User.hasMany(AuditLog, { foreignKey: 'actorUserId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'actorUserId', as: 'actor' });

MarketplaceSalon.hasMany(SalonReview, { foreignKey: 'marketplaceSalonId', as: 'reviews' });
SalonReview.belongsTo(MarketplaceSalon, { foreignKey: 'marketplaceSalonId', as: 'salon' });
SalonReview.belongsTo(User, { foreignKey: 'userId', as: 'author' });
User.hasMany(SalonReview, { foreignKey: 'userId', as: 'salonReviews' });

User.hasMany(CustomerFavorite, { foreignKey: 'userId', as: 'favorites' });
CustomerFavorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });
CustomerFavorite.belongsTo(MarketplaceSalon, { foreignKey: 'marketplaceSalonId', as: 'salon' });
MarketplaceSalon.hasMany(CustomerFavorite, { foreignKey: 'marketplaceSalonId', as: 'favoritedBy' });

MarketplaceSalon.hasMany(PromoCode, { foreignKey: 'salonId', as: 'promoCodes' });
PromoCode.belongsTo(MarketplaceSalon, { foreignKey: 'salonId', as: 'salon' });

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
  MarketplaceSalon,
  PlatformServiceCategory,
  PlatformHomeBanner,
  SalonReview,
  CustomerFavorite,
  PromoCode,
};
