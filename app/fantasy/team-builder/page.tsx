'use client';

import { Suspense, useState, useMemo, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, pointerWithin, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useUpdateFantasyTeam, useCreateFantasyTeam } from '@/lib/queries/fantasy-teams-test.queries';
import { useCreateSnapshot } from '@/lib/queries/fantasy-snapshots.queries';
import { FantasyPosition } from '@/lib/domain/types';
import { FantasyTeamCard } from '@/components/FantasyTeamSelection/FantasyTeamCard';
import { Card } from '@/components/Card';
import { PlayerList } from '@/components/FantasyTeamSelection/PlayerList';
import { TeamOverview } from '@/components/FantasyTeamSelection/TeamOverview';
import { TransfersList } from '@/components/FantasyTeamSelection/TransfersList';
import { TransferModal } from '@/components/FantasyTeamSelection/TransferModal';
import { CaptainSelectionModal } from '@/components/FantasyTeamSelection/CaptainSelectionModal';
import { PlayerWithValue } from '@/lib/api/players.api';
import { DraftRosterPlayer, validateLineup, getMaxPlayersPerPosition } from '@/lib/utils/fantasy-team-validation';
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
  computeTransfersFromSnapshots,
  isWithinTransferLimit,
} from '@/lib/utils/transfer-computation';
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
import { DragOverlayContent } from '@/components/FantasyTeamSelection/DragOverlayContent';

function FantasyPageContent() {
  const { user, isAdmin, isLoading: isLoadingAuth } = useFantasyAuth();
  const createTeamMutation = useCreateFantasyTeam();

  // Single unified data hook - eliminates double useFantasyTeamData pattern
  // Pass user ID to filter teams by ownership (admins see all teams for debug mode)
  const {
    activeSeason,
    fantasyTeams,
    weeks,
    selectedTeamId,
    selectedWeekId,
    selectedTeam,
    selectedWeek,
    setSelectedTeamId,
    snapshotWithPlayers,
    previousWeekSnapshot,
    remainingTransfers,
    allPlayers,
    isFirstWeek,
    canBypass,
    isLoading: isLoadingData,
  } = useFantasyPageData(user?.id, isAdmin);

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

  // Compute baseline players from previous week's snapshot (with positions)
  // This is what we compare against to determine transfers
  const baselinePlayers = useMemo(() => {
    if (isFirstWeek || !previousWeekSnapshot?.players) {
      return [];
    }
    return previousWeekSnapshot.players.map(p => ({
      playerId: p.player_id,
      position: p.position,
    }));
  }, [isFirstWeek, previousWeekSnapshot]);

  // Compute current transfers by comparing draft roster to baseline
  // Transfers are computed, not stored - snapshots are the source of truth
  // Transfers are paired by position to ensure validity (handler for handler, etc.)
  const computedTransfers = useMemo(() => {
    const currentPlayers = draftRoster.map(p => ({
      playerId: p.playerId,
      position: p.position,
    }));
    return computeTransfersFromSnapshots(currentPlayers, baselinePlayers);
  }, [draftRoster, baselinePlayers]);

  // Transfer count derived from computed transfers
  const transferCount = computedTransfers.length;

  // Check if over the limit (for save validation, not blocking)
  const isOverTransferLimit = !isWithinTransferLimit(transferCount, isFirstWeek);

  // Check if transfer window is open (or user can bypass)
  const isTransferWindowOpen = canBypass || (selectedWeek?.transfer_window_open ?? false);

  // Calculate team value (current market value of all players)
  const teamValue = useMemo(() => {
    return calculateRosterSalary(draftRoster, playersValueMap);
  }, [draftRoster, playersValueMap]);

  // Calculate budget with detailed breakdown for debugging
  // Budget is stored in snapshots and carried forward between weeks
  const budgetCalc = useMemo(() => {
    if (isFirstWeek || !previousWeekSnapshot?.snapshot) {
      // First week: Budget = SALARY_CAP - team value
      return {
        isFirstWeek: true,
        baselineBudget: 550,
        transferDelta: 0,
        transferDetails: [] as { playerOut: string; playerIn: string; outPrice: number; inPrice: number; delta: number }[],
        budget: 550 - teamValue,
      };
    }

    // Week 2+: Use stored budget from previous snapshot + transfer delta
    // The stored budget_remaining already accounts for all prior transactions
    const baselineBudget = previousWeekSnapshot.snapshot.budget_remaining;

    // Calculate transfer impact (sell at current price, buy at current price)
    let transferDelta = 0;
    const transferDetails: { playerOut: string; playerIn: string; outPrice: number; inPrice: number; delta: number }[] = [];

    for (const transfer of computedTransfers) {
      const playerOut = playersValueMap.get(transfer.playerOutId);
      const playerIn = playersValueMap.get(transfer.playerInId);
      const playerOutPrice = playerOut?.currentValue || 0;
      const playerInPrice = playerIn?.currentValue || 0;
      const delta = playerOutPrice - playerInPrice; // Positive = budget increases (sold high, bought low)
      transferDelta += delta;
      transferDetails.push({
        playerOut: playerOut ? `${playerOut.first_name} ${playerOut.last_name}` : transfer.playerOutId,
        playerIn: playerIn ? `${playerIn.first_name} ${playerIn.last_name}` : transfer.playerInId,
        outPrice: playerOutPrice,
        inPrice: playerInPrice,
        delta,
      });
    }

    return {
      isFirstWeek: false,
      baselineBudget,
      transferDelta,
      transferDetails,
      budget: baselineBudget + transferDelta,
    };
  }, [isFirstWeek, previousWeekSnapshot, teamValue, computedTransfers, playersValueMap]);

  const budget = budgetCalc.budget;

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Simplified handlers - no blocking, just allow transfers freely
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
          // Always allow opening the transfer modal - validation happens on save
          openTransferModal(player);
        }
        return;
      }

      const newRoster = addPlayerToRoster(draftRoster, player, playersValueMap);
      setDraftRoster(newRoster);
      setHasUnsavedChanges(true);
    },
    [selectedTeamId, selectedWeekId, allPlayers, draftRoster, playersValueMap, openTransferModal]
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

      // Always allow opening the transfer modal - validation happens on save
      openTransferModal(player);
    },
    [allPlayers, isPositionFullCallback, handleAddPlayer, openTransferModal]
  );

  const handleTransferConfirm = useCallback(
    (playerInId: string, playerOutId: string) => {
      const playerIn = allPlayers.find(p => p.id === playerInId);
      if (!playerIn || !playerIn.position) return;

      // Just update the roster - transfers are computed from the diff
      const newRoster = swapPlayersInRoster(draftRoster, playerIn, playerOutId, playersValueMap);
      setDraftRoster(newRoster);
      setHasUnsavedChanges(true);
      closeTransferModal();
    },
    [allPlayers, draftRoster, playersValueMap, closeTransferModal]
  );

  const handleCaptainSelect = useCallback(
    (playerId: string) => {
      const newRoster = setCaptain(draftRoster, playerId);
      setDraftRoster(newRoster);
      setHasUnsavedChanges(true);
    },
    [draftRoster]
  );

  // Undo a specific transfer - swap the player back to the original
  // playerInId is the player currently in the roster, playerOutId is the original player to restore
  const handleUndoTransfer = useCallback(
    (playerInId: string, playerOutId: string) => {
      // Find the original player (who was transferred out)
      const originalPlayer = allPlayers.find(p => p.id === playerOutId);
      if (!originalPlayer) {
        toast.error('Could not find original player');
        return;
      }

      // Swap them back: put originalPlayer IN, remove playerInId
      const revertedRoster = swapPlayersInRoster(draftRoster, originalPlayer, playerInId, playersValueMap);
      setDraftRoster(revertedRoster);
      setHasUnsavedChanges(true);
    },
    [allPlayers, draftRoster, playersValueMap]
  );

  // Reset restores to session start state (what was loaded from server)
  // Transfers are computed from snapshots, so just restoring the roster is enough
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
    setHasUnsavedChanges(false);
  }, [snapshotWithPlayers?.players, setDraftRoster]);

  const handleSave = useCallback(async () => {
    if (!selectedTeamId || !selectedWeekId) return;

    // Validation: Check transfer limit (only for non-first week)
    if (!isWithinTransferLimit(computedTransfers.length, isFirstWeek)) {
      toast.error(`Cannot save: Maximum 2 transfers allowed per week. You have ${computedTransfers.length}. Please undo some transfers.`, {
        duration: 5000,
      });
      return;
    }

    // Validate lineup (positions, captain, etc.) - but NOT salary cap (handled separately)
    const lineupValidation = validateLineup(
      draftRoster.map(p => ({ position: p.position, isBenched: p.isBenched, isCaptain: p.isCaptain })),
      false
    );
    if (!lineupValidation.valid) {
      const errorMessage = lineupValidation.errors.join('\n');
      toast.error(`Cannot save team:\n${errorMessage}`, {
        duration: 5000,
      });
      return;
    }

    // Validate budget using the actual computed budget (not naive salary cap check)
    // For week 1: budget = SALARY_CAP - team_value
    // For week 2+: budget = previous_budget + transfer_delta
    if (budget < 0) {
      toast.error(`Cannot save team: Budget exceeded by $${Math.abs(budget).toFixed(0)}k`, {
        duration: 5000,
      });
      return;
    }

    try {
      // Simply save the snapshot - transfers are computed from snapshot diff
      // The snapshot IS the source of truth
      await createSnapshotMutation.mutateAsync({
        fantasyTeamId: selectedTeamId,
        weekId: selectedWeekId,
        players: draftRoster,
        allowPartial: false,
      });

      setHasUnsavedChanges(false);
    } catch (error: any) {
      // Error toast is handled by mutation's onError
    }
  }, [
    selectedTeamId,
    selectedWeekId,
    draftRoster,
    budget,
    computedTransfers.length,
    isFirstWeek,
    createSnapshotMutation,
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

                // Always allow opening transfer modal - validation happens on save
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
      playersValueMap,
      openTransferModal,
      resetDragState,
    ]
  );

  if (isLoadingAuth || isLoadingData) {
    return <FantasyPageSkeleton containerClassName={styles.container} />;
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
    // Differentiate between "no weeks exist" vs "transfer window closed"
    if (weeks.length > 0) {
      // Weeks exist but no transfer window is open
      return (
        <div className={styles.container}>
          <Card className={styles.transferWindowClosed}>
            <div className={styles.transferWindowClosedContent}>
              <span className={styles.transferWindowClosedIcon}>🔒</span>
              <h3>Transfer Window Closed</h3>
              <p>The transfer window is currently closed. Check back later when the next window opens.</p>
            </div>
          </Card>
        </div>
      );
    }
    // No weeks exist at all
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
            teamEmoji={selectedTeam?.emoji || '🏆'}
            username={user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.custom_claims?.global_name || user?.email || undefined}
            teamId={selectedTeamId || ''}
            onTeamNameUpdate={async (newName: string) => {
              if (!selectedTeamId || !newName.trim()) return;
              await updateTeamMutation.mutateAsync({
                fantasyTeamId: selectedTeamId,
                updates: { name: newName.trim() },
              });
            }}
            onTeamEmojiUpdate={async (newEmoji: string) => {
              if (!selectedTeamId || !newEmoji.trim()) return;
              await updateTeamMutation.mutateAsync({
                fantasyTeamId: selectedTeamId,
                updates: { emoji: newEmoji.trim() },
              });
            }}
            isUpdatingTeamName={updateTeamMutation.isPending}
          />

          {isAdmin && (
            <div className={styles.adminControls}>
              <span className={styles.adminLabel}>🔧 Admin</span>
              {fantasyTeams.length > 1 && (
                <div className={styles.teamSelector}>
                  <select
                    className={styles.teamSelectorSelect}
                    value={selectedTeamId || ''}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                  >
                    {fantasyTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.emoji || '🏆'} {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                className={styles.adminCreateButton}
                onClick={handleCreateTeam}
                disabled={createTeamMutation.isPending || !activeSeason?.id}
              >
                {createTeamMutation.isPending ? 'Creating...' : '+ New Team'}
              </button>
            </div>
          )}


            {isTransferWindowOpen ? (
              <PlayerList
                players={allPlayers}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                teamPlayerIds={teamPlayerIds}
                onAddPlayer={handleAddPlayer}
                onSwapPlayer={handleSwapPlayer}
                isPositionFull={isPositionFullCallback}
                isLoading={false}
              />
            ) : (
              <Card className={styles.transferWindowClosed}>
                <div className={styles.transferWindowClosedContent}>
                  <span className={styles.transferWindowClosedIcon}>🔒</span>
                  <h3>Transfer Window Closed</h3>
                  <p>The transfer window for this week has closed. Check back next week to make changes to your squad.</p>
                </div>
              </Card>
            )}
          </div>

          <div className={styles.rightPanel}>
            <TeamOverview
              transfersUsed={transferCount}
              transfersRemaining={2 - transferCount}
              playerCount={draftRoster.length}
              maxPlayers={10}
              teamValue={teamValue}
              budget={budget}
              salaryCap={550}
              pitchPlayers={pitchPlayers}
              draggedPlayerPosition={activePlayer?.position || null}
              onCaptainClick={isTransferWindowOpen ? () => setCaptainModalOpen(true) : undefined}
              isFirstWeek={isFirstWeek}
              week={selectedWeek}
              onSave={handleSave}
              onReset={handleReset}
              isSaving={createSnapshotMutation.isPending}
              hasUnsavedChanges={hasUnsavedChanges}
              validationErrors={validationErrors}
              isTransferWindowOpen={isTransferWindowOpen}
              isOverTransferLimit={isOverTransferLimit}
            />

            <TransfersList
              transfers={computedTransfers}
              players={playersMap}
              onUndoTransfer={isTransferWindowOpen ? handleUndoTransfer : undefined}
              isTransferWindowOpen={isTransferWindowOpen}
              hasUnsavedChanges={hasUnsavedChanges}
              isFirstWeek={isFirstWeek}
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
    </DndContext>
  );
}

// Wrap in Suspense for useSearchParams (required by Next.js App Router)
export default function TeamBuilderPage() {
  return (
    <Suspense fallback={<FantasyPageSkeleton containerClassName={styles.container} />}>
      <FantasyPageContent />
    </Suspense>
  );
}
