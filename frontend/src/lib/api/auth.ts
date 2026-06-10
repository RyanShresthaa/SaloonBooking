import api from '../axios';

export const registerUser = (data: { name: string; email: string; password: string }) =>
  api.post('/auth/register', data);

export const loginUser = (data: { email: string; password: string }) =>
  api.post('/auth/login', data);

export const resendVerificationEmail = (data: { email: string }) =>
  api.post('/auth/resend-verification', data);

export const requestPasswordReset = (data: { email: string }) => api.post('/auth/forgot-password', data);

export const resetPassword = (data: { token: string; password: string }) =>
  api.post('/auth/reset-password', data);

export const getMe = () => api.get('/auth/me');

export const patchMe = (data: {
  name?: string;
  clientNotes?: string;
  allergies?: string;
  marketingEmailOptIn?: boolean;
}) => api.patch('/auth/me', data);

export const exportMySalonData = () => api.get('/auth/me/export');
