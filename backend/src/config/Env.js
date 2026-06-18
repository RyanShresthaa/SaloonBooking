import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const toInt = (val, fallback) => {
  const n = parseInt(val, 10);
  return isNaN(n) || n < 0 ? fallback : n;
};

const env = {
  port: toInt(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST,
    port: toInt(process.env.DB_PORT, 5432),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: toInt(process.env.EMAIL_PORT, 587),
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  //mail provider not used yet
  mailProvider: ['resend', 'smtp'].includes(process.env.MAIL_PROVIDER?.toLowerCase())
    ? process.env.MAIL_PROVIDER.toLowerCase()
    : 'auto',

  resendApiKey: process.env.RESEND_API_KEY?.trim(),
  emailFrom: process.env.EMAIL_FROM?.trim(),
  authEmailVerificationRequired: process.env.AUTH_EMAIL_VERIFICATION_REQUIRED === '1',
  corsAllowVercelPreviews: process.env.CORS_ALLOW_VERCEL_PREVIEWS === '1',

  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: toInt(process.env.REDIS_PORT, 6379),
  },

  clientOrigins: (process.env.CLIENT_URL || 'http://localhost:5174')
    .split(',').map(s => s.trim()).filter(Boolean),
  get clientUrl() { return this.clientOrigins[0]; },

  staffSeedPassword: process.env.STAFF_SEED_PASSWORD?.trim()
    || (isProd ? undefined : 'salon-dev-demo-staff-password'),

  features: {
    reminderEmails:  process.env.FEATURE_REMINDER_EMAILS  !== '0',
    retail:          process.env.FEATURE_RETAIL           !== '0',
    waitlist:        process.env.FEATURE_WAITLIST         !== '0',
    visitFeedback:   process.env.FEATURE_VISIT_FEEDBACK   !== '0',
    bulkNotify:      process.env.FEATURE_BULK_NOTIFY      !== '0',
    publicBooking:   process.env.FEATURE_PUBLIC_BOOKING   !== '0',
    stripeDeposits:  process.env.FEATURE_STRIPE_DEPOSITS  !== '0' && !!process.env.STRIPE_SECRET_KEY,
  },

 //Not in use yet
  stripe: {
    secretKey:          process.env.STRIPE_SECRET_KEY,
    webhookSecret:      process.env.STRIPE_WEBHOOK_SECRET,
    depositAmountCents: toInt(process.env.STRIPE_DEPOSIT_AMOUNT_CENTS, 2000),
    currency:           process.env.STRIPE_CURRENCY || 'usd',
  },

  defaultSalonId: (process.env.DEFAULT_SALON_ID || 'f47ac10b-58cc-4372-a567-0e02b2c3d479').trim(),
  customerCancelMinHours:     toInt(process.env.CUSTOMER_CANCEL_MIN_HOURS,     isProd ? 24 : 0),
  customerRescheduleMinHours: toInt(process.env.CUSTOMER_RESCHEDULE_MIN_HOURS, isProd ? 48 : 0),
};

export default env;