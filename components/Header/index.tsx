'use client';

import Link from 'next/link';
import styles from './index.module.scss';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';

interface HeaderProps {
    children?: ReactNode;
}

export const Header = ({ children }: HeaderProps) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const isHome = pathname === '/';

    return (
        <header className={`${styles.Header} ${isHome ? styles.home : ''}`}>
            <div className={styles.container}>
                <div className={styles.content}>
                    <Link href="/" className={styles.logo}>
                        <Image src="/images/logo.svg" alt="Logo" width={200} height={200} />
                    </Link>
                    <button 
                        className={styles.mobileMenuButton}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {isMobileMenuOpen ? (
                                <path d="M18 6L6 18M6 6l12 12" />
                            ) : (
                                <path d="M3 12h18M3 6h18M3 18h18" />
                            )}
                        </svg>
                    </button>
                    <nav className={`${styles.nav} ${isMobileMenuOpen ? styles.mobileOpen : ''}`}>
                        <Link href="/" data-active={isHome} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                        <Link href="/news" data-active={pathname === '/news'} onClick={() => setIsMobileMenuOpen(false)}>News</Link>
                        <Link href="/fixtures" data-active={pathname === '/fixtures'} onClick={() => setIsMobileMenuOpen(false)}>Fixtures</Link>
                        <Link href="/players" data-active={pathname === '/players'} onClick={() => setIsMobileMenuOpen(false)}>Players</Link>
                        <Link href="/fantasy" data-active={pathname === '/fantasy'} onClick={() => setIsMobileMenuOpen(false)}>Fantasy</Link>
                        <div className={styles.user}>
                            {children}
                        </div>
                    </nav>
                </div>
                {/* <div className={styles.news}>
                    TODO news links here
                </div> */}
            </div>
        </header>
    );
};