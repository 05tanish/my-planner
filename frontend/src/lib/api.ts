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

// Track if a logout redirect is already in progress
let isRedirectingToLogin = false;

// Handle 401 — auto logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthPage = window.location.pathname.startsWith('/login') ||
                       window.location.pathname.startsWith('/forgot-password') ||
                       window.location.pathname.startsWith('/reset-password') ||
                       window.location.pathname.startsWith('/register');

    if (status === 401 && !isAuthPage && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      useAuthStore.getState().logout();
      setTimeout(() => {
        window.location.href = '/login';
        isRedirectingToLogin = false;
      }, 100);
    }
    return Promise.reject(error);
  }
);
