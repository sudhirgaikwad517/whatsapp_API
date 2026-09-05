import { create } from 'zustand';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  organizationId: string;
  allowedPages?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  setAuth: (user: User) => void;
  startImpersonation: (tenantUser: User) => void;
  stopImpersonation: () => Promise<void>;
  logout: () => Promise<void>;
  syncUser: () => Promise<void>;
}

// The auth tokens themselves live only in httpOnly cookies set by the server —
// this store keeps just the non-sensitive user object, for instant UI state on
// reload (a stale copy is harmless; syncUser() below refreshes it from /auth/me).
const STORED_USER_KEY = 'auth_user';
const STORED_IMPERSONATING_KEY = 'is_impersonating';

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: readStoredUser(),
  isAuthenticated: !!readStoredUser(),
  isImpersonating: localStorage.getItem(STORED_IMPERSONATING_KEY) === 'true',

  setAuth: (user: User) => {
    localStorage.setItem(STORED_USER_KEY, JSON.stringify(user));
    localStorage.removeItem(STORED_IMPERSONATING_KEY);
    set({ user, isAuthenticated: true, isImpersonating: false });
  },

  startImpersonation: (tenantUser: User) => {
    // The backend has already swapped the session cookie to the impersonation
    // token (and stashed the super admin's own token) as a side effect of the
    // /superadmin/impersonate call — this only updates local UI state.
    localStorage.setItem(STORED_USER_KEY, JSON.stringify(tenantUser));
    localStorage.setItem(STORED_IMPERSONATING_KEY, 'true');
    set({ user: tenantUser, isAuthenticated: true, isImpersonating: true });
  },

  stopImpersonation: async () => {
    try {
      const { apiClient } = await import('../services/api.client');
      const res = await apiClient.post('/superadmin/stop-impersonation');
      const restoredUser = res.data?.data?.user;
      if (restoredUser) {
        localStorage.setItem(STORED_USER_KEY, JSON.stringify(restoredUser));
        localStorage.removeItem(STORED_IMPERSONATING_KEY);
        set({ user: restoredUser, isAuthenticated: true, isImpersonating: false });
        return;
      }
    } catch (err) {
      console.warn('Failed to restore super admin session:', err);
    }
    localStorage.removeItem(STORED_USER_KEY);
    localStorage.removeItem(STORED_IMPERSONATING_KEY);
    set({ user: null, isAuthenticated: false, isImpersonating: false });
  },

  logout: async () => {
    try {
      const { apiClient } = await import('../services/api.client');
      await apiClient.post('/auth/logout');
    } catch {
      // Best-effort: even if the revoke call fails, still clear local state below.
    }
    localStorage.removeItem(STORED_USER_KEY);
    localStorage.removeItem(STORED_IMPERSONATING_KEY);
    set({ user: null, isAuthenticated: false, isImpersonating: false });

    // Stay on this dashboard's own login page — this app's session is
    // deliberately separate from wabtic-website's (see auth-cookies.ts on the
    // backend), so logging out here should never bounce the user out to the
    // marketing site.
    window.location.href = '/login';
  },

  syncUser: async () => {
    try {
      const { apiClient } = await import('../services/api.client');
      const res = await apiClient.get('/auth/me');
      if (res.data?.data?.user) {
        const freshUser = res.data.data.user;
        localStorage.setItem(STORED_USER_KEY, JSON.stringify(freshUser));
        set({ user: freshUser, isAuthenticated: true });
      }
    } catch (err) {
      // If unauthorized, the cookie is invalid/expired — leave state as-is;
      // the next authenticated API call's 401 handling will redirect to login.
      console.warn('Failed to sync user profile:', err);
    }
  },
}));
