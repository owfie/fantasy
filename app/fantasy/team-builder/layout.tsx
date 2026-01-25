import { ReactNode } from 'react';

interface TeamBuilderLayoutProps {
  children: ReactNode;
  modal?: ReactNode;
}

export default function TeamBuilderLayout({ children, modal }: TeamBuilderLayoutProps) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
