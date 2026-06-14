import api from '../axios';

/** When omitted, the API uses the server default tenant for customers; staff scope is taken from the JWT. */
export const listServices = (salonId?: string | null) =>
  api.get('/services', {
    params: salonId != null && String(salonId).trim() !== '' ? { salonId: String(salonId).trim() } : {},
  });

export const getService = (id: string, salonId?: string | null) =>
  api.get(`/services/${id}`, {
    params: salonId != null && String(salonId).trim() !== '' ? { salonId: String(salonId).trim() } : {},
  });
