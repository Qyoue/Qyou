// lib/stores/useAuthStore.ts
"use client";
import create from "zustand";

export type User = {
  id: string;
  name: string;
  email: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;
  logoutClient: () => void; // clears client state
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  setUser: (user) =>
    set(() => ({
      user,
      isAuthenticated: !!user,
      loading: false,
    })),
  setLoading: (v) => set(() => ({ loading: v })),
  logoutClient: () =>
    set(() => ({ user: null, isAuthenticated: false, loading: false })),
}));
