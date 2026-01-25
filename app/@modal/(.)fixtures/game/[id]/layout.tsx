import { ReactNode } from 'react';
import Modal from './Modal';

export default async function ModalLayout({ children }: { children: ReactNode }) {
  return (
    <Modal>{children}</Modal>
  );
}


