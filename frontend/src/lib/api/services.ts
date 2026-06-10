import api from '../axios';

export const listServices = () => api.get('/services');

export const getService = (id: string) => api.get(`/services/${id}`);
