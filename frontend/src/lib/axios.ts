import axios from 'axios';

function isLoopbackOrLocalhostUrl(url: string): boolean {
  try {
    const withProto = /^[a-z]+:\/\//i.test(url) ? url : `http://${url}`;
    const { hostname } = new URL(withProto);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

/** Ensure requests hit `/api/...` even when VITE_API_URL is only the origin (common misconfig). */
function normalizeApiBaseUrl(raw: string | undefined): string {
  const trimmed = raw?.trim();
  if (trimmed) {
    if (import.meta.env.PROD && isLoopbackOrLocalhostUrl(trimmed)) {
      throw new Error(
        'VITE_API_URL must be a public API URL in production (not localhost). Set it in Vercel → Settings → Environment Variables, then redeploy.',
      );
    }
    const t = trimmed.replace(/\/+$/, '');
    if (t.endsWith('/api')) return t;
    return `${t}/api`;
  }
  if (import.meta.env.PROD) {
    throw new Error(
      'Missing VITE_API_URL. In Vercel: Project → Settings → Environment Variables → add VITE_API_URL (e.g. https://your-api.onrender.com/api), then redeploy the frontend.',
    );
  }
  /** Same-origin `/api` in dev — proxied by Vite to the API (see `vite.config.ts`). Avoids `ERR_CONNECTION_REFUSED` when the SPA origin is not :5000. */
  return '/api';
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
  },
);

export default api;
