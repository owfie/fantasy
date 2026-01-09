'use client';

import { useState, useEffect } from 'react';
import styles from './index.module.scss';
import type { PlayerWithPrices } from '@/lib/domain/repositories/value-changes.repository';

const STORAGE_KEY = 'ticker-paused';

interface TickerClientProps {
    prices: PlayerWithPrices[];
}

export default function TickerClient({ prices }: TickerClientProps) {
    const [isPaused, setIsPaused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Load preference from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
            setIsPaused(saved === 'true');
        }
        setMounted(true);
    }, []);

    const togglePause = () => {
        const newValue = !isPaused;
        setIsPaused(newValue);
        localStorage.setItem(STORAGE_KEY, String(newValue));
    };

    // Double the items for seamless infinite scroll
    const tickerItems = [...prices, ...prices];

    return (
        <div 
            className={styles.Ticker}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div 
                className={`${styles.TickerTrack} ${isPaused ? styles.Paused : ''}`}
            >
                {tickerItems.map((player, index) => (
                    <div key={`${player.player_id}-${index}`} className={styles.TickerItem}>
                        <span className={styles.PlayerName}>
                            {player.first_name.charAt(0)}. {player.last_name}
                        </span>
                        <span className={styles.PlayerValue}>
                            ${player.current_value.toFixed(1)}m
                        </span>
                        {player.change !== null && player.change !== 0 && (
                            <span className={player.change > 0 ? styles.ChangeUp : styles.ChangeDown}>
                                {player.change > 0 ? '▲' : '▼'}
                                {Math.abs(player.change).toFixed(1)}
                            </span>
                        )}
                    </div>
                ))}
            </div>
            
            {mounted && (
                <button
                    className={`${styles.PauseButton} ${isHovered ? styles.Visible : ''}`}
                    onClick={togglePause}
                    aria-label={isPaused ? 'Play ticker' : 'Pause ticker'}
                >
                    {isPaused ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
}

