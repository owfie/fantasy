'use client';

import Link from 'next/link';
import styles from './index.module.scss';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface HeaderProps {
    authSlot?: ReactNode;
}

export const Header = ({ authSlot }: HeaderProps) => {

    const pathname = usePathname();
    const isHome = pathname === '/';

    return (
        <header className={`${styles.Header} ${isHome ? styles.home : ''}`}>
            <div className={styles.container}>
                <div className={styles.content}>
                    <Link href="/" className={styles.logo}>
                        <Image src="/images/logo.svg" alt="Logo" width={200} height={200} />
                    </Link>
                    <nav className={styles.nav}>
                        <Link href="/" data-active={isHome}>Home</Link>
                        <Link href="/news" data-active={pathname === '/news'}>News</Link>
                        <Link href="/fixtures" data-active={pathname === '/fixtures'}>Fixtures</Link>
                        <Link href="/players" data-active={pathname === '/players'}>Players</Link>
                        <Link href="/fantasy" data-active={pathname === '/fantasy'}>Fantasy</Link>
                        <div className={styles.user}>
                            {authSlot}
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