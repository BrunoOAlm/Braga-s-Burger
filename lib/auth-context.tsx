'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import * as api from './api-client';
import { ApiError } from './api-client';
import type { LoginRequest, SignupRequest, User } from './types-api';

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User };

export interface AuthContextValue {
  state: AuthState;
  login: (body: LoginRequest) => Promise<void>;
  signup: (body: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const user = await api.getMe();
      setState({ status: 'authenticated', user });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setState({ status: 'anonymous' });
      } else {
        setState({ status: 'anonymous' });
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const login = useCallback(async (body: LoginRequest) => {
    await api.login(body);
    const user = await api.getMe();
    setState({ status: 'authenticated', user });
  }, []);

  const signup = useCallback(async (body: SignupRequest) => {
    const user = await api.signup(body);
    setState({ status: 'authenticated', user });
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setState({ status: 'anonymous' });
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
