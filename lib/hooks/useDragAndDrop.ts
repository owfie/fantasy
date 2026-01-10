/**
 * Hook to manage drag and drop state
 */

import { useState, useCallback } from 'react';
import { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { PlayerWithValue } from '@/lib/api/players.api';
import { DraftRosterPlayer } from '@/lib/utils/fantasy-team-validation';

export function useDragAndDrop() {
  const [activePlayer, setActivePlayer] = useState<PlayerWithValue | null>(null);
  const [activePositionPlayer, setActivePositionPlayer] = useState<DraftRosterPlayer | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    
    if (data?.type === 'player') {
      setActivePlayer(data.player);
      setActivePositionPlayer(null);
    } else if (data?.type === 'position-player' && data.player) {
      setActivePlayer(data.player);
      setActivePositionPlayer(data.positionPlayer || null);
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    setActivePlayer(null);
    setActivePositionPlayer(null);
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Track drag over state for visual feedback
    // The activePlayer state already contains the dragged player info
  }, []);

  const handleDragEnd = useCallback(() => {
    setActivePlayer(null);
    setActivePositionPlayer(null);
  }, []);

  return {
    activePlayer,
    activePositionPlayer,
    handleDragStart,
    handleDragCancel,
    handleDragOver,
    handleDragEnd,
  };
}

