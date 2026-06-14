import env from '../config/Env.js';

/**
 * Public booking widgets: `salonId` query optional; falls back to configured default tenant.
 */
export function resolvePublicSalonId(querySalonId) {
  const q = String(querySalonId || '').trim();
  if (q) return q;
  return env.defaultSalonId;
}

/** Staff/admin must belong to a salon for operational routes. */
export function requireStaffSalonId(user) {
  const role = String(user?.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'staff') return user?.salonId ?? null;
  if (!user?.salonId) {
    const e = new Error('Your account is not assigned to a salon');
    e.statusCode = 403;
    throw e;
  }
  return user.salonId;
}
