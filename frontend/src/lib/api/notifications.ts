import api from '../axios';

export const bulkNotify = (formData: FormData) =>
  api.post('/notifications/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getNotificationLogs = (batchId?: string) =>
  api.get('/notifications/logs', { params: batchId ? { batchId } : {} });

export const listBulkBatches = () => api.get('/notifications/bulk-batches');

export const approveNotificationLog = (id: string) => api.post(`/notifications/logs/${id}/approve`);

export const declineNotificationLog = (id: string) => api.post(`/notifications/logs/${id}/decline`);

export const approveAllInBatch = (batchId: string) =>
  api.post(`/notifications/batches/${batchId}/approve-all`);

export const sendTemplateReminder = (payload: { appointmentId: string; templateId: string }) =>
  api.post('/notifications/reminder', payload);

export const markBookingNotificationFinished = (logId: string) =>
  api.post(`/notifications/logs/${logId}/mark-finished`);
