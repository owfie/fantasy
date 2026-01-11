'use client';

import { Suspense, useState, useMemo, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, pointerWithin, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useUpdateFantasyTeam, useCreateFantasyTeam } from '@/lib/queries/fantasy-teams-test.queries';
import { useCreateSnapshot } from '@/lib/queries/fantasy-snapshots.queries';
import { useExecuteTransfer } from '@/lib/queries/transfers.queries';
import { FantasyPosition } from '@/lib/domain/types';
import { FantasyTeamCard } from '@/components/FantasyTeamSelection/FantasyTeamCard';
import { PlayerList } from '@/components/FantasyTeamSelection/PlayerList';
import { TeamOverview } from '@/components/FantasyTeamSelection/TeamOverview';
import { TransfersList } from '@/components/FantasyTeamSelection/TransfersList';
import { TransferModal } from '@/components/FantasyTeamSelection/TransferModal';
import { CaptainSelectionModal } from '@/components/FantasyTeamSelection/CaptainSelectionModal';
import { PlayerWithValue } from '@/lib/api/players.api';
import { DraftRosterPlayer, validateFantasyTeam, getMaxPlayersPerPosition } from '@/lib/utils/fantasy-team-validation';
import { toast } from 'sonner';
import styles from './page.module.scss';

import { useFantasyAuth } from '@/lib/hooks/useFantasyAuth';
import { useDraftRoster } from '@/lib/hooks/useDraftRoster';
import { useFantasyPageData } from '@/lib/hooks/useFantasyPageData';
import { useFantasyTeamValidation } from '@/lib/hooks/useFantasyTeamValidation';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { useDragAndDrop } from '@/lib/hooks/useDragAndDrop';
import { useTransferModal } from '@/lib/hooks/useTransferModal';

import {
  calculateRosterSalary,
  parseDropZoneId,
  isPositionFull,
  createPlayersMap,
  createPlayersValueMap,
  getSwapCandidates,
  ensureSingleCaptain,
} from '@/lib/utils/fantasy-roster-utils';
import {
  calculateTransferLimitStatus,
  createUnsavedTransfer,
  UnsavedTransfer,
} from '@/lib/utils/fantasy-transfer-utils';
import {
  addPlayerToRoster,
  swapPlayersInRoster,
  setCaptain,
  canAddPlayer,
  isPlayerInRoster,
} from '@/lib/utils/fantasy-roster-operations';

import {
  UnauthenticatedState,
  NoTeamState,
  NoSeasonState,
  NoWeekState,
} from '@/components/FantasyTeamSelection/FantasyTeamEmptyStates';
import { FantasyPageSkeleton } from '@/components/FantasyTeamSelection/FantasyPageSkeleton';
import { UnsavedChangesDialog } from '@/components/FantasyTeamSelection/UnsavedChangesDialog';
import { DebugRosterDisplay } from '@/components/FantasyTeamSelection/DebugRosterDisplay';
import { DragOverlayContent } from '@/components/FantasyTeamSelection/DragOverlayContent';

// Debug: Toggle skeleton visibility for visual adjustments
// Set to true to enable the toggle button
const DEBUG_SHOW_SKELETON = true;

// Debug toggle component - floating button to switch between skeleton and UI
function DebugSkeletonToggle({
  showSkeleton,
  onToggle
}: {
  showSkeleton: boolean;
  onToggle: () => void;
}) {
  if (!DEBUG_SHOW_SKELETON) return null;

  return (
    <button
      onClick={onToggle}
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 9999,
        padding: '0.75rem 1rem',
        backgroundColor: showSkeleton ? '#3b82f6' : '#6b7280',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      {showSkeleton ? '🦴 Skeleton' : '✨ Actual UI'}
      <span style={{
        fontSize: '0.75rem',
        opacity: 0.8,
        marginLeft: '0.25rem'
      }}>
        (click to toggle)
      </span>
    </button>
  );
}

function FantasyPageContent() {
  const [debugShowSkeleton, setDebugShowSkeleton] = useState(false);
  const { user, isLoading: isLoadingAuth } = useFantasyAuth();
  const createTeamMutation = useCreateFantasyTeam();

  // Single unified data hook - eliminates double useFantasyTeamData pattern
  const {
    activeSeason,
    fantasyTeams,
    selectedTeamId,
    selectedWeekId,
    selectedTeam,
    selectedWeek,
    snapshotWithPlayers,
    remainingTransfers,
    weekTransfers,
    allPlayers,
    isFirstWeek,
    isLoading: isLoadingData,
  } = useFantasyPageData();

  const {
    draftRoster,
    setDraftRoster,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  } = useDraftRoster(snapshotWithPlayers, selectedWeekId, selectedTeamId);

  const { validationErrors } = useFantasyTeamValidation(draftRoster, allPlayers);

  const {
    showNavigateAwayDialog,
    handleConfirmNavigateAway,
    handleCancelNavigateAway,
  } = useUnsavedChangesGuard(hasUnsavedChanges);

  const handleCreateTeam = useCallback(async () => {
    if (!user?.id || !activeSeason?.id) {
      toast.error('Cannot create team: Missing user or active season');
      return;
    }

    try {
      await createTeamMutation.mutateAsync({
        ownerId: user.id,
        seasonId: activeSeason.id,
        name: 'My Fantasy Team',
      });
      // Query invalidation will refresh the page and show the new team
    } catch (error) {
      // Error toast is handled by mutation's onError
    }
  }, [user?.id, activeSeason?.id, createTeamMutation]);

  const {
    activePlayer,
    activePositionPlayer,
    handleDragStart,
    handleDragCancel,
    handleDragOver,
    handleDragEnd: resetDragState,
  } = useDragAndDrop();

  const {
    isOpen: transferModalOpen,
    playerIn: transferModalPlayerIn,
    selectedPlayerOutId: transferModalSelectedPlayerOutId,
    openModal: openTransferModal,
    closeModal: closeTransferModal,
    setSelectedPlayerOutId: setTransferModalSelectedPlayerOutId,
  } = useTransferModal();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'pitch' | 'list'>('pitch');
  const [unsavedTransfers, setUnsavedTransfers] = useState<UnsavedTransfer[]>([]);
  const [captainModalOpen, setCaptainModalOpen] = useState(false);

  const playersValueMap = useMemo(() => createPlayersValueMap(allPlayers), [allPlayers]);
  const playersMap = useMemo(() => createPlayersMap(allPlayers), [allPlayers]);

  const teamPlayerIds = useMemo(() => new Set(draftRoster.map(p => p.playerId)), [draftRoster]);

  const pitchPlayers = useMemo(() => {
    return draftRoster.map(sp => ({
      playerId: sp.playerId,
      position: sp.position,
      isBenched: sp.isBenched,
      isCaptain: sp.isCaptain,
      player: allPlayers.find(p => p.id === sp.playerId),
    }));
  }, [draftRoster, allPlayers]);

  const teamTransfers = useMemo(() => {
    return weekTransfers.filter(t => t.fantasy_team_id === selectedTeamId);
  }, [weekTransfers, selectedTeamId]);

  const transfersUsed = teamTransfers.length;
  const transfersRemaining = remainingTransfers ?? 0;

  const isTransferLimitReached = useMemo(() => {
    return calculateTransferLimitStatus(
      remainingTransfers,
      transfersUsed,
      unsavedTransfers.length,
      isFirstWeek
    );
  }, [remainingTransfers, transfersUsed, unsavedTransfers.length, isFirstWeek]);

  const salary = useMemo(() => {
    return calculateRosterSalary(draftRoster, playersValueMap);
  }, [draftRoster, playersValueMap]);

  const isPositionFullCallback = useCallback(
    (position: FantasyPosition) => isPositionFull(draftRoster, position),
    [draftRoster]
  );

  const getSwapCandidatesCallback = useCallback(
    (position: FantasyPosition) => getSwapCandidates(draftRoster, position, allPlayers),
    [draftRoster, allPlayers]
  );

  const createSnapshotMutation = useCreateSnapshot();
  const updateTeamMutation = useUpdateFantasyTeam();
  const executeTransferMutation = useExecuteTransfer();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleAddPlayer = useCallback(
    (playerId: string) => {
      if (!selectedTeamId || !selectedWeekId) return;

      const player = allPlayers.find(p => p.id === playerId);
      if (!player || !player.position) return;

      const result = canAddPlayer(draftRoster, player);
      if (!result.success) {
        if (result.error) {
          toast.error(result.error);
        }
        if (result.needsTransfer) {
          // In first week, always use transfer modal but label it as "Swap Player"
          if (isFirstWeek) {
            openTransferModal(player);
            return;
          }
          
          // After first week, check transfer limit
          if (isTransferLimitReached) {
            toast.error('Transfer limit has been reached. You cannot make any more transfers this week.');
            return;
          }
          
          openTransferModal(player);
        }
        return;
      }

      const newRoster = addPlayerToRoster(draftRoster, player, playersValueMap);
      setDraftRoster(newRoster);
      setHasUnsavedChanges(true);
    },
    [selectedTeamId, selectedWeekId, allPlayers, draftRoster, isFirstWeek, isTransferLimitReached, playersValueMap, openTransferModal, getSwapCandidatesCallback]
  );

  const handleSwapPlayer = useCallback(
    (playerId: string) => {
      const player = allPlayers.find(p => p.id === playerId);
      if (!player || !player.position) return;

      const playerPosition = player.position as FantasyPosition;
      if (!isPositionFullCallback(playerPosition)) {
        handleAddPlayer(playerId);
        return;
      }

      // In first week, always use transfer modal but label it as "Swap Player"
      if (isFirstWeek) {
        openTransferModal(player);
        return;
      }

      // After first week, check transfer limit
      if (isTransferLimitReached) {
        toast.error('Transfer limit has been reached. You cannot make any more transfers this week.');
        return;
      }

      openTransferModal(player);
    },
    [allPlayers, isPositionFullCallback, handleAddPlayer, isFirstWeek, draftRoster, playersValueMap, getSwapCandidatesCallback, isTransferLimitReached, openTransferModal]
  );

  const handleTransferConfirm = useCallback(
    (playerInId: string, playerOutId: string) => {
      const playerIn = allPlayers.find(p => p.id === playerInId);
      if (!playerIn || !playerIn.position) return;

      const newRoster = swapPlayersInRoster(draftRoster, playerIn, playerOutId, playersValueMap);
      setDraftRoster(newRoster);
      setHasUnsavedChanges(true);

      // Only track transfers if not in first week (first week has no transfer records)
      if (!isFirstWeek) {
        setUnsavedTransfers((prev) => [...prev, createUnsavedTransfer(playerInId, playerOutId)]);
      }
      closeTransferModal();
    },
    [allPlayers, draftRoster, playersValueMap, isFirstWeek, closeTransferModal]
  );

  const handleCaptainSelect = useCallback(
    (playerId: string) => {
      const newRoster = setCaptain(draftRoster, playerId);
      setDraftRoster(newRoster);
      setHasUnsavedChanges(true);
    },
    [draftRoster]
  );

  const handleReset = useCallback(() => {
    if (!snapshotWithPlayers?.players) {
      setDraftRoster([]);
    } else {
      const roster: DraftRosterPlayer[] = snapshotWithPlayers.players.map(sp => ({
        playerId: sp.player_id,
        position: sp.position,
        isBenched: sp.is_benched,
        isCaptain: sp.is_captain,
      }));
      setDraftRoster(roster);
    }
    setUnsavedTransfers([]);
    setHasUnsavedChanges(false);
  }, [snapshotWithPlayers?.players, setDraftRoster]);

  const handleSave = useCallback(async () => {
    if (!selectedTeamId || !selectedWeekId) return;

    const validation = validateFantasyTeam(draftRoster, playersValueMap, false);
    if (!validation.valid) {
      const errorMessage = validation.errors.join('\n');
      toast.error(`Cannot save team:\n${errorMessage}`, {
        duration: 5000,
      });
      return;
    }

    try {
      // Only execute transfers if not in first week (first week has no transfer records)
      if (!isFirstWeek) {
        for (const transfer of unsavedTransfers) {
          await executeTransferMutation.mutateAsync({
            fantasyTeamId: selectedTeamId,
            playerInId: transfer.playerInId,
            playerOutId: transfer.playerOutId,
            weekId: selectedWeekId,
          });
        }
      }

      await createSnapshotMutation.mutateAsync({
        fantasyTeamId: selectedTeamId,
        weekId: selectedWeekId,
        players: draftRoster,
        allowPartial: false,
      });

      setUnsavedTransfers([]);
      setHasUnsavedChanges(false);
    } catch (error: any) {
      // Error toast is handled by mutation's onError
    }
  }, [
    selectedTeamId,
    selectedWeekId,
    draftRoster,
    playersValueMap,
    unsavedTransfers,
    isFirstWeek,
    createSnapshotMutation,
    executeTransferMutation,
  ]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
    const { active, over } = event;
      resetDragState();
    
      if (!over || !selectedTeamId || !selectedWeekId) {
      return;
    }

    const activeData = active.data.current;
    const isPositionDrag = activeData?.type === 'position-player';
    const player = activeData?.player as PlayerWithValue | undefined;

    if (!player || !player.position) {
      return;
    }
    
    if (!['handler', 'cutter', 'receiver'].includes(player.position)) {
      toast.error(`Invalid player position: ${player.position}`);
      return;
    }

      const dropZoneInfo = parseDropZoneId(over.id.toString());
      if (!dropZoneInfo) {
      return;
    }

      const { targetPosition, slotIndex, isBench } = dropZoneInfo;
    
    if (player.position !== targetPosition) {
      toast.error(`Cannot place ${player.position} in ${targetPosition} position`);
      return;
    }

    if (isPositionDrag && activeData.positionPlayer) {
      const sourcePositionPlayer = activeData.positionPlayer as DraftRosterPlayer;
      const sourceDropId = activeData.dropId as string;
      
        if (sourceDropId === over.id.toString()) {
        return;
      }
      
      setDraftRoster((prevRoster) => {
        const targetPositionPlayers = prevRoster.filter(p => p.position === targetPosition);
        let targetPlayer: DraftRosterPlayer | undefined;
        
        if (isBench) {
          const benchPlayers = targetPositionPlayers.filter(p => p.isBenched);
          targetPlayer = benchPlayers[slotIndex];
        } else {
          const fieldPlayers = targetPositionPlayers.filter(p => !p.isBenched);
          targetPlayer = fieldPlayers[slotIndex];
        }
        
        const newRoster = prevRoster.filter(
            p => p.playerId !== sourcePositionPlayer.playerId && (!targetPlayer || p.playerId !== targetPlayer.playerId)
        );
        
        const positions: FantasyPosition[] = ['handler', 'cutter', 'receiver'];
        const maxPlayersPerPosition = getMaxPlayersPerPosition();
        const finalRoster: DraftRosterPlayer[] = [];
        
        for (const pos of positions) {
          const positionPlayers = newRoster.filter(p => p.position === pos);
          const fieldPlayers = positionPlayers.filter(p => !p.isBenched);
          const benchPlayers = positionPlayers.filter(p => p.isBenched);
          
          if (pos === targetPosition) {
            const positionLimits = maxPlayersPerPosition[pos];
            
            if (isBench) {
              const updatedBench = [...benchPlayers];
              updatedBench.splice(Math.min(slotIndex, updatedBench.length), 0, {
                ...sourcePositionPlayer,
                isBenched: true,
              });
              
              if (targetPlayer && targetPlayer.playerId !== sourcePositionPlayer.playerId) {
                  if (!sourcePositionPlayer.isBenched) {
                  const updatedField = [...fieldPlayers, { ...targetPlayer, isBenched: false }];
                  finalRoster.push(...updatedField.slice(0, positionLimits.starting));
                  const excess = updatedField.slice(positionLimits.starting).map(p => ({ ...p, isBenched: true }));
                  updatedBench.push(...excess);
                }
              } else {
                finalRoster.push(...fieldPlayers.slice(0, positionLimits.starting));
              }
              
              finalRoster.push(...updatedBench.slice(0, positionLimits.bench));
            } else {
              if (targetPlayer && targetPlayer.playerId !== sourcePositionPlayer.playerId) {
                if (targetPlayer.isBenched) {
                  const updatedField = [...fieldPlayers, { ...sourcePositionPlayer, isBenched: false }];
                  const sourceIndex = updatedField.findIndex(p => p.playerId === sourcePositionPlayer.playerId);
                  if (sourceIndex !== -1 && sourceIndex !== slotIndex) {
                    updatedField.splice(sourceIndex, 1);
                      updatedField.splice(Math.min(slotIndex, updatedField.length), 0, {
                        ...sourcePositionPlayer,
                        isBenched: false,
                      });
                  }
                  const starting = updatedField.slice(0, positionLimits.starting);
                  const excess = updatedField.slice(positionLimits.starting).map(p => ({ ...p, isBenched: true }));
                  const updatedBench = [...benchPlayers, { ...targetPlayer, isBenched: true }];
                  finalRoster.push(...starting);
                  finalRoster.push(...excess, ...updatedBench.slice(0, positionLimits.bench));
                } else {
                  const allFieldPlayers = prevRoster.filter(p => p.position === pos && !p.isBenched);
                  const sourceIndex = allFieldPlayers.findIndex(p => p.playerId === sourcePositionPlayer.playerId);
                  const targetIndex = allFieldPlayers.findIndex(p => p.playerId === targetPlayer.playerId);
                  
                  if (sourceIndex !== -1 && targetIndex !== -1) {
                    const swappedField = allFieldPlayers.map((p, idx) => {
                      if (idx === sourceIndex) {
                        return { ...targetPlayer, isBenched: false, isCaptain: targetPlayer.isCaptain };
                      } else if (idx === targetIndex) {
                        return { ...sourcePositionPlayer, isBenched: false, isCaptain: sourcePositionPlayer.isCaptain };
                      }
                      return p;
                    });
                    const starting = swappedField.slice(0, positionLimits.starting);
                    const excess = swappedField.slice(positionLimits.starting).map(p => ({ ...p, isBenched: true }));
                    finalRoster.push(...starting);
                    finalRoster.push(...benchPlayers, ...excess.slice(0, positionLimits.bench));
                  } else {
                      const updatedField = [
                        ...fieldPlayers,
                      { ...sourcePositionPlayer, isBenched: false },
                        { ...targetPlayer, isBenched: false },
                    ];
                    const starting = updatedField.slice(0, positionLimits.starting);
                    const excess = updatedField.slice(positionLimits.starting).map(p => ({ ...p, isBenched: true }));
                    finalRoster.push(...starting);
                    finalRoster.push(...benchPlayers, ...excess);
                  }
                }
              } else {
                const updatedField = [...fieldPlayers, { ...sourcePositionPlayer, isBenched: false }];
                const starting = updatedField.slice(0, positionLimits.starting);
                const excess = updatedField.slice(positionLimits.starting).map(p => ({ ...p, isBenched: true }));
                finalRoster.push(...starting);
                finalRoster.push(...benchPlayers, ...excess);
              }
            }
          } else {
            if (targetPlayer && targetPlayer.position === pos) {
              if (targetPlayer.isBenched) {
                benchPlayers.push({ ...targetPlayer, isBenched: true });
              } else {
                fieldPlayers.push({ ...targetPlayer, isBenched: false });
              }
            }
            const positionLimits = maxPlayersPerPosition[pos];
            finalRoster.push(...fieldPlayers.slice(0, positionLimits.starting));
            finalRoster.push(...benchPlayers.slice(0, positionLimits.bench));
          }
        }
        
        if (sourcePositionPlayer.isCaptain) {
          finalRoster.forEach(p => {
            p.isCaptain = p.playerId === sourcePositionPlayer.playerId;
          });
        } else {
            return ensureSingleCaptain(finalRoster, playersValueMap);
        }

        setHasUnsavedChanges(true);
        return finalRoster;
      });
      
        return;
    }

    const maxPlayersPerPosition = getMaxPlayersPerPosition();
      const positionLimits = maxPlayersPerPosition[targetPosition];

    setDraftRoster((prevRoster) => {
        const currentPlayersAtPosition = prevRoster.filter(p => p.position === targetPosition);
      const fieldPlayersAtPosition = currentPlayersAtPosition.filter(p => !p.isBenched);
      const benchPlayersAtPosition = currentPlayersAtPosition.filter(p => p.isBenched);
        const isPlayerOnTeam = isPlayerInRoster(prevRoster, player.id);
      let newRoster: DraftRosterPlayer[] = [];
      const positions: FantasyPosition[] = ['handler', 'cutter', 'receiver'];
      
      for (const pos of positions) {
        if (pos === targetPosition) {
            const otherPlayersAtPos = prevRoster.filter(p => p.position === pos && p.playerId !== player.id);
          
          if (isBench) {
            if (benchPlayersAtPosition.length >= positionLimits.bench) {
              toast.error(`Cannot add more ${targetPosition}s to bench. Maximum ${positionLimits.bench} allowed.`);
              return prevRoster;
            }
            const fieldPlayers = otherPlayersAtPos.filter(p => !p.isBenched).slice(0, positionLimits.starting);
            const benchPlayers = otherPlayersAtPos.filter(p => p.isBenched);
            newRoster.push(...fieldPlayers);
            newRoster.push({
              playerId: player.id,
                position: targetPosition,
              isBenched: true,
              isCaptain: false,
            });
            newRoster.push(...benchPlayers);
          } else {
            if (!isPlayerOnTeam && fieldPlayersAtPosition.length >= positionLimits.starting) {
              if (benchPlayersAtPosition.length >= positionLimits.bench) {
                // In first week, always use transfer modal but label it as "Swap Player"
                if (isFirstWeek) {
                  const fieldPlayers = otherPlayersAtPos.filter(p => !p.isBenched);
                  const targetSlotPlayer = fieldPlayers[slotIndex] || fieldPlayers[fieldPlayers.length - 1];
                  if (targetSlotPlayer) {
                    openTransferModal(player, targetSlotPlayer.playerId);
                    return prevRoster;
                  } else {
                    openTransferModal(player);
                    return prevRoster;
                  }
                }
                
                // After first week, check transfer limit
                if (isTransferLimitReached) {
                  toast.error('Transfer limit has been reached. You cannot make any more transfers this week.');
                  return prevRoster;
                }
                const fieldPlayers = otherPlayersAtPos.filter(p => !p.isBenched);
                const targetSlotPlayer = fieldPlayers[slotIndex] || fieldPlayers[fieldPlayers.length - 1];
                if (targetSlotPlayer) {
                  openTransferModal(player, targetSlotPlayer.playerId);
                  return prevRoster;
                } else {
                  openTransferModal(player);
                  return prevRoster;
                }
              } else {
                const fieldPlayers = otherPlayersAtPos.filter(p => !p.isBenched).slice(0, positionLimits.starting);
                const benchPlayers = otherPlayersAtPos.filter(p => p.isBenched);
                newRoster.push(...fieldPlayers);
                newRoster.push({
                  playerId: player.id,
                    position: targetPosition,
                  isBenched: true,
                  isCaptain: false,
                });
                newRoster.push(...benchPlayers);
              }
            } else {
              interface PlayerWithSlot {
                player: DraftRosterPlayer;
                slot: number;
              }
              
              const sortedFieldPlayers: PlayerWithSlot[] = otherPlayersAtPos
                .filter(p => !p.isBenched)
                .map(p => {
                  const slot = pitchPlayers.findIndex(
                    pp => pp.playerId === p.playerId && pp.position === pos && !pp.isBenched
                  );
                  return { player: p, slot: slot >= 0 ? slot : 999 };
                })
                .sort((a, b) => a.slot - b.slot);
              
              sortedFieldPlayers.splice(slotIndex, 0, {
                player: {
                  playerId: player.id,
                    position: targetPosition,
                  isBenched: false,
                  isCaptain: false,
                },
                slot: slotIndex,
              });
              
              const starting = sortedFieldPlayers.slice(0, positionLimits.starting).map(p => p.player);
              const remaining = sortedFieldPlayers.slice(positionLimits.starting);
              const benched = [];
              for (const item of remaining) {
                if (benchPlayersAtPosition.length + benched.length < positionLimits.bench) {
                  benched.push({ ...item.player, isBenched: true });
                } else {
                  toast.error(`Cannot add more ${targetPosition}s. Field and bench are full.`);
                  return prevRoster;
                }
              }
              const existingBench = otherPlayersAtPos.filter(p => p.isBenched);
              newRoster.push(...starting);
              newRoster.push(...benched);
              newRoster.push(...existingBench);
            }
          }
        } else {
          newRoster.push(...prevRoster.filter(p => p.position === pos));
        }
      }
      
      if (!isPlayerOnTeam && !newRoster.some(p => p.playerId === player.id)) {
        const playerPos = player.position as FantasyPosition;
        const positionLimitsForPlayer = maxPlayersPerPosition[playerPos];
          const benchPlayersForPlayer = prevRoster.filter(p => p.position === playerPos && p.isBenched);
        
        if (benchPlayersForPlayer.length < positionLimitsForPlayer.bench) {
          newRoster.push({
            playerId: player.id,
            position: playerPos,
            isBenched: true,
            isCaptain: false,
          });
        } else {
          toast.error(`Cannot add more ${playerPos}s. Bench is full.`);
          return prevRoster;
        }
      }

        const finalRoster = ensureSingleCaptain(newRoster, playersValueMap);
      setHasUnsavedChanges(true);
        return finalRoster;
      });
    },
    [
      selectedTeamId,
      selectedWeekId,
      pitchPlayers,
      allPlayers,
      isFirstWeek,
      isTransferLimitReached,
      playersValueMap,
      openTransferModal,
      resetDragState,
    ]
  );

  if (isLoadingAuth || isLoadingData) {
    return <FantasyPageSkeleton containerClassName={styles.container} />;
  }

  // Debug: Show skeleton toggle for visual comparison
  if (debugShowSkeleton) {
    return (
      <>
        <FantasyPageSkeleton containerClassName={styles.container} />
        <DebugSkeletonToggle
          showSkeleton={debugShowSkeleton}
          onToggle={() => setDebugShowSkeleton(false)}
        />
      </>
    );
  }

  if (!user) {
    return <UnauthenticatedState containerClassName={styles.container} />;
  }

  if (fantasyTeams.length === 0) {
    return (
      <NoTeamState
        containerClassName={styles.container}
        onCreateTeam={handleCreateTeam}
        isCreating={createTeamMutation.isPending}
        canCreate={!!user?.id && !!activeSeason?.id}
      />
    );
  }

  if (!activeSeason) {
    return <NoSeasonState containerClassName={styles.container} />;
  }

  if (!selectedWeek) {
    return <NoWeekState containerClassName={styles.container} />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={styles.container}>
        
        <div className={styles.content}>
          <div className={styles.leftPanel}>
            <FantasyTeamCard
            teamName={selectedTeam?.name || ''}
            teamEmoji="🏆"
            username={user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.custom_claims?.global_name || user?.email || undefined}
            teamId={selectedTeamId || ''}
            onTeamNameUpdate={async (newName: string) => {
              if (!selectedTeamId || !newName.trim()) return;
              await updateTeamMutation.mutateAsync({
                fantasyTeamId: selectedTeamId,
                updates: { name: newName.trim() },
              });
            }}
            isUpdatingTeamName={updateTeamMutation.isPending}
          />

            <PlayerList
              players={allPlayers}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              teamPlayerIds={teamPlayerIds}
              onAddPlayer={handleAddPlayer}
              onSwapPlayer={handleSwapPlayer}
              isPositionFull={isPositionFullCallback}
              isTransferLimitReached={isTransferLimitReached}
              isLoading={false}
            />
          </div>

          <div className={styles.rightPanel}>
            <TeamOverview
              transfersUsed={transfersUsed + unsavedTransfers.length}
              transfersRemaining={transfersRemaining}
              playerCount={draftRoster.length}
              maxPlayers={10}
              salary={salary}
              salaryCap={450}
              pitchPlayers={pitchPlayers}
              draggedPlayerPosition={activePlayer?.position || null}
              onCaptainClick={() => setCaptainModalOpen(true)}
              isFirstWeek={isFirstWeek}
              week={selectedWeek}
              onSave={handleSave}
              onReset={handleReset}
              isSaving={createSnapshotMutation.isPending}
              hasUnsavedChanges={hasUnsavedChanges}
              validationErrors={validationErrors}
            />

            <TransfersList
              transfers={teamTransfers}
              unsavedTransfers={unsavedTransfers}
              players={playersMap}
            />
          </div>
        </div>
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 150,
          easing: 'ease-out',
        }}
        style={{
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <DragOverlayContent
          activePlayer={activePlayer}
          activePositionPlayer={activePositionPlayer}
        />
      </DragOverlay>

      <UnsavedChangesDialog
        isOpen={showNavigateAwayDialog}
        onConfirm={handleConfirmNavigateAway}
        onCancel={handleCancelNavigateAway}
      />

      {transferModalPlayerIn && (
        <TransferModal
          isOpen={transferModalOpen}
          onClose={closeTransferModal}
          playerIn={transferModalPlayerIn}
          swapCandidates={getSwapCandidatesCallback(transferModalPlayerIn.position as FantasyPosition)}
          selectedPlayerOutId={transferModalSelectedPlayerOutId}
          onConfirm={handleTransferConfirm}
          title={isFirstWeek ? 'Swap Player' : 'Transfer'}
          confirmButtonText={isFirstWeek ? 'Swap Player' : 'Transfer'}
        />
      )}

      <CaptainSelectionModal
        isOpen={captainModalOpen}
        onClose={() => setCaptainModalOpen(false)}
        fieldPlayers={pitchPlayers
          .filter(p => !p.isBenched && p.player)
          .map(p => ({
            player: p.player!,
            playerId: p.playerId,
            isCaptain: p.isCaptain,
          }))}
        onSelect={handleCaptainSelect}
      />

      <DebugSkeletonToggle
        showSkeleton={debugShowSkeleton}
        onToggle={() => setDebugShowSkeleton(true)}
      />
    </DndContext>
  );
}

// Wrap in Suspense for useSearchParams (required by Next.js App Router)
export default function FantasyPage() {
  return (
    <Suspense fallback={<FantasyPageSkeleton containerClassName={styles.container} />}>
      <FantasyPageContent />
    </Suspense>
  );
}
