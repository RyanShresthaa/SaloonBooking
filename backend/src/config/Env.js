import dotenv from 'dotenv';

dotenv.config();

// ─── Constants ───

const DEFAULT_CLIENT_URL = 'http://localhost:5174';
const DEFAULT_APP_PORT = 5000;
const DEFAULT_DB_PORT = 5432;
const DEFAULT_EMAIL_PORT = 587;
const DEFAULT_REDIS_HOST = '127.0.0.1';
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_JWT_EXPIRES_IN = '7d';
const DEFAULT_STRIPE_DEPOSIT_CENTS = 2000;
const DEFAULT_STRIPE_CURRENCY = 'usd';
const DEV_STAFF_SEED_PASSWORD = 'salon-dev-demo-staff-password';

// ─── Helpers ───

function parseClientOrigins() {
  const raw = process.env.CLIENT_URL || DEFAULT_CLIENT_URL;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeMailProvider() {
  const p = (process.env.MAIL_PROVIDER || 'auto').trim().toLowerCase();
  if (p === 'resend' || p === 'smtp') return p;
  return 'auto';
}

function resolveStaffSeedPassword() {
  const fromEnv = process.env.STAFF_SEED_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  const n = process.env.NODE_ENV || 'development';
  if (n === 'production') return undefined;
  return DEV_STAFF_SEED_PASSWORD;
}

/** Non-negative integer from env, or fallback when missing/invalid. */
function parseNonNegativeInt(raw, fallback) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const n = parseInt(String(raw).trim(), 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return n;
}

// ─── Exports ───

const clientOrigins = parseClientOrigins();
const clientUrl = clientOrigins[0] || DEFAULT_CLIENT_URL;

const env = {
  port: parseInt(process.env.PORT, 10) || DEFAULT_APP_PORT,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || DEFAULT_DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN,
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || DEFAULT_EMAIL_PORT,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  /**
   * Outbound mail transport: `resend` = Resend API only; `smtp` = nodemailer only; `auto` = Resend if
   * `RESEND_API_KEY` is set, otherwise SMTP (`EMAIL_*`).
   */
  mailProvider: normalizeMailProvider(),

  /**
   * Resend.com HTTP API (HTTPS :443). Use on Render when SMTP to Gmail/etc. times out.
   * Optional `EMAIL_FROM` e.g. `Salon <noreply@your-verified-domain.com>` (or Resend onboarding sender for tests).
   */
  resendApiKey: process.env.RESEND_API_KEY?.trim(),
  emailFrom: process.env.EMAIL_FROM?.trim(),

  /**
   * When true, registration sends verification mail and login/API require verified email.
   * Default false: new customers are verified immediately (no email verification flow).
   * Re-enable with AUTH_EMAIL_VERIFICATION_REQUIRED=1
   */
  authEmailVerificationRequired: process.env.AUTH_EMAIL_VERIFICATION_REQUIRED === '1',

  /**
   * Production only: also allow any `https://*.vercel.app` origin (preview deployments).
   * Set CORS_ALLOW_VERCEL_PREVIEWS=1 on Render when testing from Vercel preview URLs.
   */
  corsAllowVercelPreviews: process.env.CORS_ALLOW_VERCEL_PREVIEWS === '1',

  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || DEFAULT_REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10) || DEFAULT_REDIS_PORT,
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
  staffSeedPassword: resolveStaffSeedPassword(),

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
    depositAmountCents: parseInt(process.env.STRIPE_DEPOSIT_AMOUNT_CENTS || String(DEFAULT_STRIPE_DEPOSIT_CENTS), 10),
    currency: process.env.STRIPE_CURRENCY || DEFAULT_STRIPE_CURRENCY,
  },

  /** Fallback tenant for `/public/services` when `salonId` query is omitted (legacy single-salon installs). */
  defaultSalonId: (process.env.DEFAULT_SALON_ID || 'f47ac10b-58cc-4372-a567-0e02b2c3d479').trim(),

  /**
   * Minimum whole hours before visit start that a customer may self-cancel (DELETE /appointments/:id).
   * Set to `0` to allow cancellation any time before the visit starts. Default 24 in production; in
   * non-production defaults to `0` when the env var is unset so local testing is not blocked.
   */
  customerCancelMinHours: (() => {
    const raw = process.env.CUSTOMER_CANCEL_MIN_HOURS;
    const isProd = (process.env.NODE_ENV || 'development') === 'production';
    const fallback = isProd ? 24 : 0;
    return parseNonNegativeInt(raw, fallback);
  })(),

  /** Same idea for customer-driven reschedules (PUT). Default 48 in production, 0 in non-production when unset. */
  customerRescheduleMinHours: (() => {
    const raw = process.env.CUSTOMER_RESCHEDULE_MIN_HOURS;
    const isProd = (process.env.NODE_ENV || 'development') === 'production';
    const fallback = isProd ? 48 : 0;
    return parseNonNegativeInt(raw, fallback);
  })(),
};

export default env;
