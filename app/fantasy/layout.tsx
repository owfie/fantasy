import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Fantasy | Adelaide Super League',
  description: 'Manage your fantasy team for Adelaide Super League',
};

interface FantasyLayoutProps {
  children: ReactNode;
  modal?: ReactNode;
}

export default function FantasyLayout({ children, modal }: FantasyLayoutProps) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}

