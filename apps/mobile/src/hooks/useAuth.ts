import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmailWithToken: (verificationToken: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetPassword: (token: string, newPass: string) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    // Graceful fallback for non-provider usage / testing
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      verifyEmailWithToken: async () => true,
      requestPasswordReset: async () => true,
      resetPassword: async () => true,
    };
  }
  return context;
}
