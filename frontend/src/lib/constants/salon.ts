/** Aligns with backend `DEFAULT_SALON_ID` / Phase B legacy tenant UUID. */
export const LEGACY_DEFAULT_SALON_ID =
  (import.meta.env.VITE_DEFAULT_SALON_ID as string | undefined)?.trim() ||
  'f47ac10b-58cc-4372-a567-0e02b2c3d479';
