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

type AdminUser = adminApi.AdminUser;

type AdminAuthState = {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AdminAuthState | undefined>(undefined);

async function fetchMe(): Promise<AdminUser | null> {
  try {
    return await adminApi.me();
  } catch (e) {
    // 401 (não logado) e qualquer outro erro caem no mesmo estado: sem admin.
    void e;
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const u = await fetchMe();
    setAdmin(u);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const u = await fetchMe();
      if (cancelled) return;
      setAdmin(u);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
