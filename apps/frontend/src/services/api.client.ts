import axios from 'axios';

const isProduction =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('wabtic.com') || window.location.protocol === 'https:');

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || (isProduction ? 'https://api.wabtic.com/api/v1' : '/api/v1');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send/receive the httpOnly auth cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Handle 401 Unauthorized by refreshing the (cookie-based) session.
// A single in-flight refresh is shared across concurrent 401s so they don't
// race each other into issuing multiple refresh calls.
let refreshPromise: Promise<void> | null = null;

// Public pages call apiClient before any session exists at all (App.tsx's
// cookie-based session check runs unconditionally on every mount, including
// on /login itself). Redirecting to /login on failure there — while already
// on /login — still forces a full reload via window.location.href, which
// re-mounts the app, re-runs the same check, fails the same way, and
// reloads again: an infinite reload loop. Only redirect when the user is
// actually on a page that assumes an active session.
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/superadmin/login',
  '/superadmin/forgot-password',
  '/superadmin/reset-password',
];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
            .then(() => undefined)
            .finally(() => {
              refreshPromise = null;
            });
        }
        await refreshPromise;
        return apiClient(originalRequest);
      } catch {
        if (!PUBLIC_PATHS.includes(window.location.pathname)) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
