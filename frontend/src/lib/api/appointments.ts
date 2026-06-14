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
  /** When salon desk books for a registered customer by id (optional; otherwise server matches customer by email). */
  customerUserId?: string;
}

export interface AppointmentUpdatePayload {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  isVip?: boolean;
  appointmentDate?: string;
  startTime?: string;
  assignedStaffId?: string | null;
}

export const getAvailableSlots = (
  serviceId: string,
  date: string,
  opts?: { staffId?: string | null; salonId?: string | null },
) => {
  const staffId = opts?.staffId;
  const salonId = opts?.salonId;
  return api.get('/appointments/available-slots', {
    params: {
      serviceId,
      date,
      ...(staffId ? { staffId } : {}),
      ...(salonId != null && String(salonId).trim() !== '' ? { salonId: String(salonId).trim() } : {}),
    },
  });
};

export const listAppointments = () => api.get('/appointments');

export const getAppointment = (id: string) => api.get(`/appointments/${id}`);

export const createAppointment = (data: AppointmentPayload) => api.post('/appointments', data);

export const updateAppointment = (id: string, data: AppointmentUpdatePayload) =>
  api.put(`/appointments/${id}`, data);

export const cancelAppointment = (id: string) => api.delete(`/appointments/${id}`);

export const listStaffForAssignment = (opts?: { salonId?: string | null }) => {
  const salonId = opts?.salonId;
  return api.get('/appointments/staff', {
    params:
      salonId != null && String(salonId).trim() !== '' ? { salonId: String(salonId).trim() } : {},
  });
};

export const downloadAppointmentsCsv = () =>
  api.get('/appointments/export.csv', { responseType: 'blob' });
