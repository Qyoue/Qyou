import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Register | Qyou',
  description: 'Create a new Qyou account',
};

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
