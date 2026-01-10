import { ReactNode } from 'react';

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

