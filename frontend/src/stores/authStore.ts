import { create } from 'zustand';
import type { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Auth store — token is stored in an httpOnly cookie (set by backend),
 * NOT in localStorage. This prevents XSS token theft.
 * Only user metadata is kept here for UI purposes.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // start loading=true so app waits for /auth/me check
  setAuth: (user) =>
    set({ user, isAuthenticated: true, isLoading: false }),
  setUser: (user) => set({ user }),
  logout: () =>
    set({ user: null, isAuthenticated: false, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
