import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User) => void;
  logout: () => void;
}

// Auth tokens live only in httpOnly cookies set by the backend (Domain=.wabtic.com,
// shared with app.wabtic.com — see COOKIE_DOMAIN in the backend .env). This store
// only keeps the non-sensitive user object for instant UI state on reload.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setAuth: (user) => set({ user, isAuthenticated: true }),

      logout: () => {
        import('../lib/api.client').then(({ apiClient }) => {
          apiClient.post('/auth/logout').catch(() => {
            // Best-effort: even if the revoke call fails, local state below still clears.
          });
        });
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'wabtic-auth-storage',
    }
  )
);
