import api from '../axios';

export interface AppointmentPayload {
  serviceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  appointmentDate: string;
  startTime: string;
  notes?: string;
  isVip?: boolean;
  emailRemindersOptIn?: boolean;
  assignedStaffId?: string;
  seriesId?: string;
}

export interface AppointmentUpdatePayload {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  isVip?: boolean;
  appointmentDate?: string;
  startTime?: string;
  assignedStaffId?: string | null;
}

export const getAvailableSlots = (serviceId: string, date: string, staffId?: string | null) =>
  api.get('/appointments/available-slots', {
    params: {
      serviceId,
      date,
      ...(staffId ? { staffId } : {}),
    },
  });

export const listAppointments = () => api.get('/appointments');

export const getAppointment = (id: string) => api.get(`/appointments/${id}`);

export const createAppointment = (data: AppointmentPayload) => api.post('/appointments', data);

export const updateAppointment = (id: string, data: AppointmentUpdatePayload) =>
  api.put(`/appointments/${id}`, data);

export const cancelAppointment = (id: string) => api.delete(`/appointments/${id}`);

export const listStaffForAssignment = () => api.get('/appointments/staff');

export const downloadAppointmentsCsv = () =>
  api.get('/appointments/export.csv', { responseType: 'blob' });
