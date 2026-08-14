import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

export const api = axios.create({
  // Use VITE_API_URL if provided, else use relative /api to hit the Vite proxy in local dev (prevents cross-origin cookie drops)
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  // withCredentials=true sends the httpOnly 'access_token' cookie automatically
  withCredentials: true,
});

// No manual Authorization header — cookie is sent automatically by the browser

/**
 * Track whether we have already handled a 401 in this browser session.
 * Once set to true, subsequent 401s are silently rejected without
 * calling logout() again (which would re-trigger state updates / re-renders).
 * The flag resets when the user successfully logs back in (see below).
 */
let hasLoggedOut = false;

// Handle 401 — auto logout (fires exactly once per session)
api.interceptors.response.use(
  (response) => {
    // A successful response to /auth/login means the user just logged in —
    // reset the flag so future 401s are handled again.
    if (response.config.url?.includes('/auth/login') && response.status === 200) {
      hasLoggedOut = false;
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const isAuthPage = window.location.pathname.startsWith('/login') ||
                       window.location.pathname.startsWith('/forgot-password') ||
                       window.location.pathname.startsWith('/reset-password') ||
                       window.location.pathname.startsWith('/register');

    if (status === 401 && !isAuthPage && !hasLoggedOut) {
      hasLoggedOut = true;
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
