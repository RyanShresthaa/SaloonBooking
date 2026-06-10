import api from '../axios';

/** Standard API envelope from `sendSuccess` / `sendCreated`. */
export type ApiSuccess<T> = { success: boolean; message: string; data: T };

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  speciality?: string | null;
  staffNotes?: string | null;
  createdAt?: string;
};

export type SalonHours = {
  businessStart: string;
  businessEnd: string;
  breakStart: string;
  breakEnd: string;
  timezoneNote: string;
};

export const listStaffTeam = () =>
  api.get<ApiSuccess<{ team: StaffMember[]; salonHours: SalonHours }>>('/staff/team');

export type CreateStaffMemberPayload = {
  name: string;
  email: string;
  password: string;
  role: 'staff' | 'admin';
  speciality?: string;
  staffNotes?: string;
};

export const createStaffMember = (body: CreateStaffMemberPayload) => api.post('/staff/team', body);

export type UpdateStaffMemberPayload = {
  name: string;
  email: string;
  role: 'staff' | 'admin';
  speciality?: string | null;
  staffNotes?: string | null;
  password?: string;
};

export const updateStaffMember = (id: string, body: UpdateStaffMemberPayload) => api.patch(`/staff/team/${id}`, body);

export const deleteStaffMember = (id: string) => api.delete(`/staff/team/${id}`);

export const seedDemoStaff = () => api.post<{ created: unknown[]; skipped: string[]; salonHours: SalonHours }>('/staff/team/seed-demo');

export type StaffTimeOffRow = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  staffMember?: { id: string; name: string; email: string; role: string };
};

export const listStaffTimeOff = () => api.get<ApiSuccess<StaffTimeOffRow[]>>('/staff/time-off');

export const createStaffTimeOff = (body: { userId: string; startDate: string; endDate: string; reason?: string }) =>
  api.post('/staff/time-off', body);

export const deleteStaffTimeOff = (id: string) => api.delete(`/staff/time-off/${id}`);
