import api from '../axios';

/** Unauthenticated read-only endpoints for embeddable booking widgets. */
export const listPublicServices = () => api.get('/public/services');

export const getPublicAvailableSlots = (serviceId: string, date: string, staffId?: string | null) =>
  api.get('/public/available-slots', {
    params: {
      serviceId,
      date,
      ...(staffId ? { staffId } : {}),
    },
  });
