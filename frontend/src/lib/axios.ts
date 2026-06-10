import axios from 'axios';

/** Ensure requests hit `/api/...` even when VITE_API_URL is only the origin (common misconfig). */
function normalizeApiBaseUrl(raw: string | undefined): string {
  const fallback = 'http://localhost:5000/api';
  const trimmed = (raw?.trim() || fallback).replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}

const api = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_URL),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error.config?.url || '');
    const isAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/verify-email') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/reset-password') ||
      requestUrl.includes('/auth/resend-verification');

    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
