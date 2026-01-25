import { ReactNode } from 'react';

interface NewsLayoutProps {
  children: ReactNode;
  modal: ReactNode;
}

export default function NewsLayout({ children, modal }: NewsLayoutProps) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
