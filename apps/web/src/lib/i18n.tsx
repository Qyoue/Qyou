'use client';

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'en';

type Messages = Record<string, string>;

const MESSAGES: Record<Locale, Messages> = {
  en: {
    'app.name': 'Qyou',
    'auth.login.title': 'Sign in',
    'auth.register.title': 'Create account',
    'errors.generic': 'Something went wrong. Please try again.',
    'session.expired': 'Your session has expired. Please sign in again.',
  },
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: string, fallback?: string) => MESSAGES[locale][key] ?? fallback ?? key,
    }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider.');
  return ctx;
}
