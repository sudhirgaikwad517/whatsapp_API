import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const isProduction =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('wabtic.com') || window.location.protocol === 'https:');

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || (isProduction ? 'https://api.wabtic.com/api/v1' : 'http://localhost:5050/api/v1');

// Auth is carried entirely by the httpOnly cookie the backend sets (Domain=.wabtic.com),
// so every request just needs to send it along — no token ever touches JS.
// X-Client-Surface tells the backend to read/write THIS site's own session
// cookie (websiteAccessToken/websiteRefreshToken), never the admin
// dashboard's (accessToken/refreshToken) — logging in here must never
// silently log someone into app.wabtic.com too.
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Surface': 'website',
  },
});

// Interceptor: on a 401, try one cookie-based refresh (backend reads the
// refreshToken cookie and issues a new accessToken cookie), then retry once.
let refreshPromise: Promise<void> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true, headers: { 'X-Client-Surface': 'website' } })
          .then(() => undefined)
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        await refreshPromise;
        return apiClient(originalRequest);
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);
