/**
 * Hook to manage transfer modal state
 */

import { useState, useCallback } from 'react';
import { PlayerWithValue } from '@/lib/api/players.api';

export function useTransferModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [playerIn, setPlayerIn] = useState<PlayerWithValue | null>(null);
  const [selectedPlayerOutId, setSelectedPlayerOutId] = useState<string | null>(null);

  const openModal = useCallback((player: PlayerWithValue, preselectedPlayerOutId?: string | null) => {
    setPlayerIn(player);
    setSelectedPlayerOutId(preselectedPlayerOutId || null);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setPlayerIn(null);
    setSelectedPlayerOutId(null);
  }, []);

  return {
    isOpen,
    playerIn,
    selectedPlayerOutId,
    openModal,
    closeModal,
    setSelectedPlayerOutId,
  };
}

