import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { fail, manager, ok, server } from '@/test/server';
import { renderRoute } from '@/test/render';
import { useAuthStore } from '@/store/auth';
import LoginPage from './LoginPage';

const renderLogin = () =>
  renderRoute(<LoginPage />, { path: '/login', initial: '/login', extra: [{ path: '/dashboard', element: <h1>Dashboard home</h1> }] });

describe('LoginPage', () => {
  beforeEach(() => useAuthStore.setState({ user: null, status: 'anonymous' }));

  it('validates required fields before calling the API', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('signs in with a demo account and never stores the token client-side', async () => {
    let body: unknown;
    let csrfHeader: string | null = null;
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        body = await request.json();
        csrfHeader = request.headers.get('x-requested-with');
        return ok({ user: manager, token: 'jwt-should-not-be-kept' });
      }),
    );
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /Manager/ }));
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('heading', { name: 'Dashboard home' })).toBeInTheDocument();
    expect(body).toEqual({ email: 'manager@impactlens.demo', password: 'Manager123!' });
    expect(csrfHeader).toBe('XMLHttpRequest');
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user: manager });
    expect(JSON.stringify(useAuthStore.getState())).not.toContain('jwt-should-not-be-kept');
    expect(JSON.stringify({ ...localStorage })).not.toContain('jwt');
  });

  it('shows the server’s message on invalid credentials', async () => {
    server.use(http.post('/api/auth/login', () => fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect')));
    renderLogin();
    await userEvent.type(screen.getByLabelText('Email'), 'someone@ngo.org');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Email or password is incorrect')).toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().status).toBe('anonymous'));
  });
});
