import api from '../axios';

export const listVisitFeedback = () => api.get('/visit-feedbacks');

export const createVisitFeedback = (data: { appointmentId: string; rating: number; comment?: string }) =>
  api.post('/visit-feedbacks', data);

export const updateVisitFeedback = (id: string, data: { rating?: number; comment?: string | null }) =>
  api.patch(`/visit-feedbacks/${id}`, data);

export const deleteVisitFeedback = (id: string) => api.delete(`/visit-feedbacks/${id}`);
