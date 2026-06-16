/**
 * URL-safe slug from a display string; does not guarantee uniqueness.
 * Mirrors `backend/src/utils/slugify.js` `slugifyBase`.
 */
export function slugifyBase(input: string | null | undefined): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
