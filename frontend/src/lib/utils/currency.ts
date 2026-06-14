/**
 * Salon UI currency display. Default prefix is **NRP** (as requested). Override with
 * `VITE_CURRENCY_PREFIX` (e.g. `NPR`, `Rs.`) in `.env` if you prefer another label.
 * Numeric values in the API/DB stay unchanged — only formatting changes.
 */
export const CURRENCY_PREFIX =
  (import.meta.env.VITE_CURRENCY_PREFIX as string | undefined)?.trim() || 'NRP';

/** Format a money amount for display (not for Stripe or payment APIs). */
export function formatCurrency(amount: number | string | null | undefined): string {
  const n = typeof amount === 'string' ? Number(amount) : Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  const formatted = safe.toLocaleString('en-NP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${CURRENCY_PREFIX} ${formatted}`;
}
