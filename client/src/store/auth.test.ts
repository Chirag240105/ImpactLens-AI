import { beforeEach, describe, expect, it } from 'vitest';
import { http } from 'msw';
import { fail, manager, ok, server } from '@/test/server';
import { canWrite, useAuthStore } from './auth';
import { projectsApi } from '@/api/endpoints';

describe('auth store', () => {
  beforeEach(() => useAuthStore.setState({ user: null, status: 'unknown' }));

  it('restores a session from the cookie via /auth/me', async () => {
    server.use(http.get('/api/auth/me', () => ok(manager)));
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user: manager });
  });

  it('becomes anonymous when there is no session', async () => {
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().status).toBe('anonymous');
  });

  it('expires the session when any API call returns 401', async () => {
    useAuthStore.setState({ user: manager, status: 'authenticated' });
    server.use(http.get('/api/projects', () => fail(401, 'UNAUTHORIZED', 'Invalid or expired token')));
    await expect(projectsApi.list({})).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(useAuthStore.getState().status).toBe('anonymous');
  });

  it('mirrors server RBAC for write actions', () => {
    expect(canWrite('ADMIN')).toBe(true);
    expect(canWrite('PROJECT_MANAGER')).toBe(true);
    expect(canWrite('VIEWER')).toBe(false);
  });
});
