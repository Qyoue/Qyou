import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth-context';
import { checkApiUrl } from '../lib/env-check';
import './globals.css';

checkApiUrl();

export const metadata: Metadata = {
  title: 'Qyou — Hackathon Starter',
  description: 'Authentication foundation for the Qyou hackathon starter.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Qyou — Hackathon Starter',
    description: 'Authentication foundation for the Qyou hackathon starter.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
