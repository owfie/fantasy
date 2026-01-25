'use client';

import { useRouter } from 'next/navigation';
import { Drawer } from 'vaul';
import { ReactNode } from 'react';

export default function Modal({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <Drawer.Root open onOpenChange={() => router.back()}>
      <Drawer.Portal>
        <Drawer.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
        <Drawer.Content style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
          {children}
          <Drawer.Title>Detail Page</Drawer.Title>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}


