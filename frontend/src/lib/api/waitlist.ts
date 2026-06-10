import api from '../axios';

export interface WaitlistPayload {
  serviceId: string;
  preferredDate?: string;
  phone?: string;
  notes?: string;
}

export const listWaitlist = () => api.get('/waitlist');

export const createWaitlistEntry = (data: WaitlistPayload) => api.post('/waitlist', data);

export const updateWaitlistStatus = (id: string, status: string) => api.patch(`/waitlist/${id}`, { status });
