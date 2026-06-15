'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { AuthResponse, AuthUser } from '@qyou/shared';
import { login as loginRequest, register as registerRequest } from './api-client';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'qyou.auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const persist = useCallback((result: AuthResponse) => {
    setUser(result.user);
    setAccessToken(result.tokens.accessToken);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        persist(await loginRequest({ email, password }));
      } finally {
        setIsLoading(false);
      }
    },
    [persist],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        persist(await registerRequest({ email, password }));
      } finally {
        setIsLoading(false);
      }
    },
    [persist],
  );

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
