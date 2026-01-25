import { ReactNode } from 'react';

interface PlayersLayoutProps {
  children: ReactNode;
  modal: ReactNode;
}

export default function PlayersLayout({ children, modal }: PlayersLayoutProps) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}


