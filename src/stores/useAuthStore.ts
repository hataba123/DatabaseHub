import { create } from 'zustand';
import { AuthUser, EffectivePermissionDto, PERMISSIONS } from '@/types/auth';
import { authApi } from '@/services/api/authApi';

export interface ResourceScopeCheck {
  connectionId?: string;
  database?: string;
  schema?: string;
  table?: string;
}

interface AuthState {
  user: AuthUser | null;
  roles: string[];
  permissions: EffectivePermissionDto[];
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
  hasPermission: (permission: string, scope?: ResourceScopeCheck) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  roles: [],
  permissions: [],
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  setAccessToken: (accessToken) => set({ accessToken }),

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await authApi.login({ username, password });
      set({
        user: res.user,
        roles: res.user.roles || [],
        accessToken: res.accessToken,
        isAuthenticated: true,
      });

      // Load full permissions from /me
      try {
        const me = await authApi.me();
        set({
          roles: me.roles || [],
          permissions: me.permissions || [],
        });
      } catch (err) {
        console.warn('Failed to load full permissions after login', err);
      }
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({
        user: null,
        roles: [],
        permissions: [],
        accessToken: null,
        isAuthenticated: false,
      });
    }
  },

  initializeAuth: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });
    try {
      // First try silent refresh to retrieve accessToken from HttpOnly cookie
      const refreshRes = await authApi.refresh();
      set({
        accessToken: refreshRes.accessToken,
        user: refreshRes.user,
        roles: refreshRes.user.roles || [],
        isAuthenticated: true,
      });

      // Then fetch effective permissions
      const me = await authApi.me();
      set({
        roles: me.roles || [],
        permissions: me.permissions || [],
      });
    } catch (e) {
      // Not authenticated or refresh failed
      set({
        user: null,
        roles: [],
        permissions: [],
        accessToken: null,
        isAuthenticated: false,
      });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  hasRole: (role: string) => {
    const roles = get().roles;
    return roles.includes('Super Admin') || roles.includes(role);
  },

  hasPermission: (permission: string, scope?: ResourceScopeCheck) => {
    const { permissions, roles } = get();

    // Super Admin has all permissions
    if (roles.includes('Super Admin')) {
      return true;
    }

    if (permissions.some((p) => p.permission === PERMISSIONS.ALL)) {
      return true;
    }

    const matches = permissions.filter(
      (p) => p.permission.toLowerCase() === permission.toLowerCase()
    );

    if (matches.length === 0) {
      return false;
    }

    if (!scope) {
      return true;
    }

    for (const p of matches) {
      const scopeType = p.scopeType?.toLowerCase();
      if (scopeType === 'global') {
        return true;
      }
      if (
        scopeType === 'connection' &&
        p.connectionId?.toLowerCase() === scope.connectionId?.toLowerCase()
      ) {
        return true;
      }
      if (
        scopeType === 'database' &&
        p.connectionId?.toLowerCase() === scope.connectionId?.toLowerCase() &&
        p.databaseName?.toLowerCase() === scope.database?.toLowerCase()
      ) {
        return true;
      }
      if (
        scopeType === 'schema' &&
        p.connectionId?.toLowerCase() === scope.connectionId?.toLowerCase() &&
        p.databaseName?.toLowerCase() === scope.database?.toLowerCase() &&
        p.schemaName?.toLowerCase() === scope.schema?.toLowerCase()
      ) {
        return true;
      }
      if (
        scopeType === 'table' &&
        p.connectionId?.toLowerCase() === scope.connectionId?.toLowerCase() &&
        p.databaseName?.toLowerCase() === scope.database?.toLowerCase() &&
        p.schemaName?.toLowerCase() === scope.schema?.toLowerCase() &&
        p.tableName?.toLowerCase() === scope.table?.toLowerCase()
      ) {
        return true;
      }
    }

    return false;
  },
}));
