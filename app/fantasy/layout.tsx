import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { FantasyTabs } from '@/components/FantasyTabs';
import styles from './layout.module.scss';

export const metadata: Metadata = {
  title: 'Fantasy | Adelaide Super League',
  description: 'Manage your fantasy team for Adelaide Super League',
};

interface FantasyLayoutProps {
  children: ReactNode;
  modal: ReactNode;
}

export default function FantasyLayout({ children, modal }: FantasyLayoutProps) {
  return (
    <div className={styles.fantasyLayout}>
      <div className={styles.tabsContainer}>
        <FantasyTabs />
      </div>
      {children}
      {modal}
    </div>
  );
}
