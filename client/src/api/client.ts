import axios, { AxiosError } from 'axios';
import type { ApiEnvelope, ApiErrorBody } from './types';

/**
 * Same-origin by default: Vite proxies /api in dev, and production should serve the API
 * under the same site so the httpOnly session cookie is sent (see docs/deployment.md).
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 60_000,
  // Required by the server's CSRF guard for cookie-authenticated writes.
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

export class ApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorBody['error']['details'];
  constructor(status: number, code: string, message: string, details: ApiErrorBody['error']['details'] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
/** The auth store registers here so any 401 ends the session in one place. */
export const setUnauthorizedHandler = (fn: UnauthorizedHandler | null) => {
  onUnauthorized = fn;
};

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ApiErrorBody>) => {
    const status = err.response?.status ?? 0;
    const body = err.response?.data;
    const url = err.config?.url || '';
    if (status === 401 && onUnauthorized && !url.startsWith('/auth/')) onUnauthorized();
    if (status === 0)
      return Promise.reject(
        new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the ImpactLens API. Check that the server is running.'),
      );
    if (status === 429)
      return Promise.reject(
        new ApiError(429, 'RATE_LIMITED', 'Too many requests. Please wait a moment and try again.'),
      );
    return Promise.reject(
      new ApiError(
        status,
        body?.error?.code || 'HTTP_ERROR',
        body?.error?.message || err.message || 'Request failed',
        body?.error?.details,
      ),
    );
  },
);

/** Unwraps the `{ success, data, meta }` envelope. */
export async function unwrap<T>(p: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await p;
  return res.data.data;
}

export const errorMessage = (e: unknown, fallback = 'Something went wrong'): string =>
  e instanceof ApiError || e instanceof Error ? e.message || fallback : fallback;
