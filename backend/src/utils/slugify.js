/**
 * URL-safe slug from a display string; does not guarantee uniqueness.
 */
export function slugifyBase(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
