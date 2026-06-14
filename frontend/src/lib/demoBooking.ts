/** Optional: Calendly, HubSpot meetings, or any HTTPS booking URL */
export function getDemoCalendarUrl(): string | undefined {
  const u = import.meta.env.VITE_DEMO_CALENDAR_URL;
  return typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : undefined;
}

/** When set, “Request details” opens the visitor’s mail client with this recipient */
export function getDemoContactEmail(): string | undefined {
  const e = import.meta.env.VITE_DEMO_CONTACT_EMAIL;
  if (typeof e !== 'string') return undefined;
  const t = e.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : undefined;
}
