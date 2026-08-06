import { create } from 'zustand';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  organizationId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  originalSuperAdmin: { user: User; token: string } | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  startImpersonation: (tenantUser: User, tenantToken: string) => void;
  stopImpersonation: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: localStorage.getItem('auth_user') ? JSON.parse(localStorage.getItem('auth_user')!) : null,
  token: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  isImpersonating: localStorage.getItem('is_impersonating') === 'true',
  originalSuperAdmin: localStorage.getItem('superadmin_backup')
    ? JSON.parse(localStorage.getItem('superadmin_backup')!)
    : null,

  setAuth: (user: User, accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.removeItem('is_impersonating');
    localStorage.removeItem('superadmin_backup');
    set({ user, token: accessToken, isAuthenticated: true, isImpersonating: false, originalSuperAdmin: null });
  },

  startImpersonation: (tenantUser: User, tenantToken: string) => {
    const currentState = get();
    if (currentState.user && currentState.token) {
      const backup = { user: currentState.user, token: currentState.token };
      localStorage.setItem('superadmin_backup', JSON.stringify(backup));
    }
    localStorage.setItem('access_token', tenantToken);
    localStorage.setItem('auth_user', JSON.stringify(tenantUser));
    localStorage.setItem('is_impersonating', 'true');
    set({
      user: tenantUser,
      token: tenantToken,
      isAuthenticated: true,
      isImpersonating: true,
    });
  },

  stopImpersonation: () => {
    const backupStr = localStorage.getItem('superadmin_backup');
    if (backupStr) {
      try {
        const backup = JSON.parse(backupStr);
        localStorage.setItem('access_token', backup.token);
        localStorage.setItem('auth_user', JSON.stringify(backup.user));
        localStorage.removeItem('is_impersonating');
        localStorage.removeItem('superadmin_backup');
        set({
          user: backup.user,
          token: backup.token,
          isAuthenticated: true,
          isImpersonating: false,
          originalSuperAdmin: null,
        });
        return;
      } catch {
        // fallback
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('is_impersonating');
    localStorage.removeItem('superadmin_backup');
    set({ user: null, token: null, isAuthenticated: false, isImpersonating: false, originalSuperAdmin: null });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('is_impersonating');
    localStorage.removeItem('superadmin_backup');
    set({ user: null, token: null, isAuthenticated: false, isImpersonating: false, originalSuperAdmin: null });
  },
}));
