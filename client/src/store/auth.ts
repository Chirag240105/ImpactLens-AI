import { create } from 'zustand';
import { authApi } from '@/api/endpoints';
import { setUnauthorizedHandler } from '@/api/client';
import type { Role, User } from '@/api/types';

type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

interface AuthState {
  user: User | null;
  status: SessionStatus;
}
interface AuthActions {
  /** Restores the session from the httpOnly cookie via /auth/me. */
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  expire: () => void;
}
export type AuthStore = AuthState & AuthActions;

// The JWT lives only in an httpOnly cookie set by the API; nothing token-shaped is stored client-side.
export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  status: 'unknown',
  bootstrap: async () => {
    if (get().status === 'authenticated') return;
    try {
      set({ user: await authApi.me(), status: 'authenticated' });
    } catch {
      set({ user: null, status: 'anonymous' });
    }
  },
  login: async (email, password) => {
    const { user } = await authApi.login({ email, password });
    set({ user, status: 'authenticated' });
    return user;
  },
  register: async (name, email, password) => {
    const { user } = await authApi.register({ name, email, password });
    set({ user, status: 'authenticated' });
    return user;
  },
  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, status: 'anonymous' });
    }
  },
  expire: () => set({ user: null, status: 'anonymous' }),
}));

setUnauthorizedHandler(() => {
  if (useAuthStore.getState().status === 'authenticated') useAuthStore.getState().expire();
});

/** Mirrors server RBAC: ADMIN and PROJECT_MANAGER can write, VIEWER is read-only. */
export const canWrite = (role?: Role) => role === 'ADMIN' || role === 'PROJECT_MANAGER';
export const useCanWrite = () => useAuthStore((s) => canWrite(s.user?.role));

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  PROJECT_MANAGER: 'Project manager',
  VIEWER: 'Viewer',
};
