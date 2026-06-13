import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true, isLoading: false }),
      setUser: (user) => set({ user }),
      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'devos-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
