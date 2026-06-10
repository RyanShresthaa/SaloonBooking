import api from '../axios';

export const listTemplates = () => api.get('/templates');

export const getTemplate = (id: string) => api.get(`/templates/${id}`);
