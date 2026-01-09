import { ReactNode } from 'react';

interface FixturesLayoutProps {
  children: ReactNode;
  modal: ReactNode;
}

export default function FixturesLayout({ children, modal }: FixturesLayoutProps) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}

// TypeScript: Ensure parallel route slot is typed correctly
export type Props = {
  children: ReactNode;
  modal: ReactNode;
};

