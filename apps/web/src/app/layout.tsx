import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth-context';
import { I18nProvider } from '../lib/i18n';
import { ToastProvider } from '../components/Toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Qyou — Hackathon Starter',
  description: 'Authentication foundation for the Qyou hackathon starter.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
