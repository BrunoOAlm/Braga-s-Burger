'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import * as adminApi from './admin-api';
import { ApiError } from './admin-api';

type AdminUser = adminApi.AdminUser;

type AdminAuthState = {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AdminAuthState | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await adminApi.me();
      setAdmin(u);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setAdmin(null);
      } else {
        setAdmin(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      await adminApi.login(email, password);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    try {
      await adminApi.logout();
    } catch {
      /* segue */
    }
    setAdmin(null);
  }, []);

  return (
    <Ctx.Provider value={{ admin, loading, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return v;
}
