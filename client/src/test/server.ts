import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const ok = <T,>(data: T) => HttpResponse.json({ success: true, data, meta: {} });
export const fail = (status: number, code: string, message: string) =>
  HttpResponse.json({ success: false, error: { code, message, details: [] } }, { status });

export const manager = { id: 'u1', name: 'Demo Manager', email: 'manager@impactlens.demo', role: 'PROJECT_MANAGER' as const };

/** Default handlers; individual tests override with server.use(). */
export const server = setupServer(
  http.get('/api/auth/me', () => fail(401, 'UNAUTHORIZED', 'Authentication required')),
  http.get('/api/health', () => ok({ status: 'ok', database: 'connected', cloudinary: 'demo-mode', aiProvider: 'mock' })),
);
