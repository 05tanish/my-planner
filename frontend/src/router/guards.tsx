import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { AppLayout } from '../components/layout/AppLayout';
import { api } from '../lib/api';

/**
 * On mount, calls /auth/me to validate the httpOnly cookie session with the server.
 * If valid, sets user data in memory. If invalid/expired, redirects to /login.
 * This makes authentication fully server-side — no localStorage token storage.
 */
export function ProtectedRoute() {
  const { isAuthenticated, setAuth, logout } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then((res) => {
        const user = res.data?.data;
        if (user) setAuth(user);
        setChecking(false);
      })
      .catch(() => {
        logout();
        setChecking(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export function AuthRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
