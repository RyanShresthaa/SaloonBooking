import axios from 'axios';

/** Login returned 403 because the account exists but email is not verified yet. */
export function isUnverifiedEmailLoginError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (error.response?.status !== 403) return false;
  const msg = String((error.response.data as { message?: string } | undefined)?.message || '').toLowerCase();
  return msg.includes('verify') && msg.includes('email');
}

type ApiErrorBody = {
  message?: string;
  errors?: { field?: string; message?: string }[];
};

const STATUS_HINTS: Record<number, string> = {
  400: 'Check the form and try again.',
  401: 'Sign in again to continue.',
  403: 'You do not have permission to do that.',
  404: 'That item could not be found.',
  409: 'That action conflicts with the current state.',
  429: 'Too many requests. Wait a moment and try again.',
  500: 'The server had a problem. Try again in a few minutes.',
  503: 'The service is temporarily unavailable.',
};

function joinBodyMessage(data: ApiErrorBody): string {
  const parts: string[] = [];
  if (data.message) parts.push(data.message);
  if (data.errors?.length) {
    parts.push(
      data.errors
        .map((e) => (e.field ? `${e.field}: ${e.message ?? ''}` : e.message))
        .filter(Boolean)
        .join(' · ')
    );
  }
  return parts.filter(Boolean).join(' — ');
}

/** Readable message from failed API calls (validation arrays, status hints). */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as ApiErrorBody | undefined;
  const status = error.response?.status;
  const hint = status ? STATUS_HINTS[status] : undefined;

  if (data) {
    const body = joinBodyMessage(data);
    if (body) return body;
  }
  if (hint) return hint;
  return fallback;
}
