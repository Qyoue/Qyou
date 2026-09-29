import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Log In | Qyou',
  description: 'Log in to your Qyou account',
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
