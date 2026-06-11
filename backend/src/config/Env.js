import dotenv from 'dotenv';

dotenv.config();

/** Comma-separated `CLIENT_URL` values → SPA origins for CORS / Socket.IO (first = primary for email links). */
const parseClientOrigins = () => {
  const raw = process.env.CLIENT_URL || 'http://localhost:5174';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const clientOrigins = parseClientOrigins();
const clientUrl = clientOrigins[0] || 'http://localhost:5174';

const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
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
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },

  /** Primary SPA origin (emails, Stripe redirects). Use first entry from `CLIENT_URL`. */
  clientUrl,
  /** All allowed SPA origins (CORS). Set `CLIENT_URL` to one URL or comma-separated list. */
  clientOrigins,

  /**
   * Used by POST /api/staff/team/seed-demo (min 6 chars after trim).
   * In non-production, defaults so the admin "Add demo stylists" button works without extra .env.
   * Production must set STAFF_SEED_PASSWORD explicitly.
   */
  staffSeedPassword: (() => {
    const fromEnv = process.env.STAFF_SEED_PASSWORD?.trim();
    if (fromEnv) return fromEnv;
    const n = process.env.NODE_ENV || 'development';
    if (n === 'production') return undefined;
    return 'salon-dev-demo-staff-password';
  })(),

  /** Feature toggles (set to "0" to disable; default enabled where noted). */
  features: {
    reminderEmails: process.env.FEATURE_REMINDER_EMAILS !== '0',
    retail: process.env.FEATURE_RETAIL !== '0',
    waitlist: process.env.FEATURE_WAITLIST !== '0',
    visitFeedback: process.env.FEATURE_VISIT_FEEDBACK !== '0',
    bulkNotify: process.env.FEATURE_BULK_NOTIFY !== '0',
    publicBooking: process.env.FEATURE_PUBLIC_BOOKING !== '0',
    stripeDeposits:
      process.env.FEATURE_STRIPE_DEPOSITS !== '0' && Boolean(process.env.STRIPE_SECRET_KEY),
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    depositAmountCents: parseInt(process.env.STRIPE_DEPOSIT_AMOUNT_CENTS || '2000', 10),
    currency: process.env.STRIPE_CURRENCY || 'usd',
  },
};

export default env;
