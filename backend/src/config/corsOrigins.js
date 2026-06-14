import env from './Env.js';

// ─── Constants ───

/** Vercel production + preview URLs (HTTPS only). */
const VERCEL_APP_ORIGIN = /^https:\/\/[^\s/]+\.vercel\.app$/i;

const LOCAL_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

// ─── Helpers ───

function allowedOriginSet() {
  const fromEnv = [...env.clientOrigins];
  if (env.nodeEnv !== 'production') {
    return new Set([...fromEnv, ...LOCAL_DEV_ORIGINS]);
  }
  return new Set(fromEnv);
}

// ─── Exports ───

/**
 * @param {string | undefined} origin Request Origin header (missing for same-origin / some tools).
 */
export function isAllowedClientOrigin(origin) {
  if (!origin) return true;
  const set = allowedOriginSet();
  if (set.has(origin)) return true;
  if (env.nodeEnv === 'production' && env.corsAllowVercelPreviews && VERCEL_APP_ORIGIN.test(origin)) {
    return true;
  }
  return false;
}

/** Socket.IO `cors.origin`: explicit list + optional RegExp for Vercel previews. */
export function socketCorsOriginOption() {
  const list = env.nodeEnv === 'production' ? [...env.clientOrigins] : [...env.clientOrigins, ...LOCAL_DEV_ORIGINS];
  if (env.nodeEnv === 'production' && env.corsAllowVercelPreviews) {
    return [...list, VERCEL_APP_ORIGIN];
  }
  return list;
}
