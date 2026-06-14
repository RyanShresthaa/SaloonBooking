import api from '../axios';
import { LEGACY_DEFAULT_SALON_ID } from '../constants/salon';

/** Unauthenticated read-only endpoints for embeddable booking widgets. */
export const listPublicServices = (salonId?: string | null) =>
  api.get('/public/services', {
    params: { salonId: salonId?.trim() || LEGACY_DEFAULT_SALON_ID },
  });

export const getPublicAvailableSlots = (
  serviceId: string,
  date: string,
  opts?: { staffId?: string | null; salonId?: string | null },
) =>
  api.get('/public/available-slots', {
    params: {
      serviceId,
      date,
      ...(opts?.staffId ? { staffId: opts.staffId } : {}),
      salonId: opts?.salonId?.trim() || LEGACY_DEFAULT_SALON_ID,
    },
  });
