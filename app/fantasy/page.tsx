'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay, pointerWithin, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useActiveSeason, useFantasyTeams, useAddPlayerToFantasyTeam, useUpdateFantasyTeam } from '@/lib/queries/fantasy-teams-test.queries';
import { useSnapshotForWeek, useSnapshotWithPlayers, useCreateSnapshot } from '@/lib/queries/fantasy-snapshots.queries';
import { useRemainingTransfers, useIsFirstWeek, useTransfersByWeek, useExecuteTransfer, UNLIMITED_TRANSFERS } from '@/lib/queries/transfers.queries';
import { useWeeks } from '@/lib/queries/seasons.queries';
import { usePlayersForWeek } from '@/lib/queries/players.queries';
import { FantasyPosition } from '@/lib/domain/types';
import { TeamSelectionHeader } from '@/components/FantasyTeamSelection/TeamSelectionHeader';
import { PlayerList } from '@/components/FantasyTeamSelection/PlayerList';
import { TeamOverview } from '@/components/FantasyTeamSelection/TeamOverview';
import { TransfersList } from '@/components/FantasyTeamSelection/TransfersList';
import { PlayerCard } from '@/components/FantasyTeamSelection/PlayerCard';
import { PlayerWithValue } from '@/lib/api/players.api';
import { formatCurrency, formatPlayerName, getPositionCode } from '@/lib/utils/fantasy-utils';
import { getTeamJerseyPath } from '@/lib/utils/team-utils';
import { DiscordLogin } from '@/components/discord-login';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { toast } from 'sonner';
import { DraftRosterPlayer, validateFantasyTeam, getMaxPlayersPerPosition } from '@/lib/utils/fantasy-team-validation';
import Image from 'next/image';
import styles from './page.module.scss';
import positionStyles from '@/components/FantasyTeamSelection/PitchFormation.module.scss';

export default function FantasyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  const { data: activeSeason } = useActiveSeason();
  const { data: fantasyTeams = [] } = useFantasyTeams(activeSeason?.id || null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<FantasyPosition[]>(['handler']);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'pitch' | 'list'>('pitch');
  
  // Local state for draft roster (unsaved changes)
  const [draftRoster, setDraftRoster] = useState<DraftRosterPlayer[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showNavigateAwayDialog, setShowNavigateAwayDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const hasGuardState = useRef(false);

  // Check authentication
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      setUser(authUser);
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync selectedTeamId when fantasyTeams changes
  useEffect(() => {
    if (fantasyTeams.length > 0) {
      // If no team is selected or selected team doesn't exist in array, select the first one
      const targetTeamId = fantasyTeams[0]?.id || null;
      if (!selectedTeamId || !fantasyTeams.find(t => t.id === selectedTeamId)) {
        // Only update if the value actually changes
        if (selectedTeamId !== targetTeamId) {
          setSelectedTeamId(targetTeamId);
        }
      }
    } else {
      // Only update if selectedTeamId is not already null
      if (selectedTeamId !== null) {
        setSelectedTeamId(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fantasyTeams]); // Only depend on fantasyTeams, not selectedTeamId to avoid infinite loop

  const { data: weeks = [] } = useWeeks(activeSeason?.id || '');
  
  // Auto-select first week if available
  const firstWeekId = weeks[0]?.id || null;
  const currentWeekId = selectedWeekId || firstWeekId;
  const selectedWeek = weeks.find(w => w.id === currentWeekId) || weeks[0];

  const { data: snapshot } = useSnapshotForWeek(selectedTeamId || '', currentWeekId || '');
  const { data: snapshotWithPlayers } = useSnapshotWithPlayers(snapshot?.id || '');

  // Initialize draft roster from snapshot when it loads or week/team changes
  useEffect(() => {
    if (snapshotWithPlayers?.players) {
      const roster: DraftRosterPlayer[] = snapshotWithPlayers.players.map(sp => ({
        playerId: sp.player_id,
        position: sp.position as FantasyPosition,
        isBenched: sp.is_benched,
        isCaptain: sp.is_captain,
      }));
      setDraftRoster(roster);
      setHasUnsavedChanges(false);
    } else {
      setDraftRoster([]);
      setHasUnsavedChanges(false);
    }
  }, [snapshotWithPlayers, currentWeekId, selectedTeamId]);
  const { data: remainingTransfers } = useRemainingTransfers(selectedTeamId || '', currentWeekId || '');
  const { data: isFirstWeek } = useIsFirstWeek(selectedTeamId || '', currentWeekId || '');
  const { data: weekTransfers = [] } = useTransfersByWeek(currentWeekId || '');
  // For API call, if all positions selected, pass undefined. Otherwise, we'll filter client-side.
  // Since usePlayersForWeek only accepts single position, we'll get all players and filter client-side
  const { data: allPlayers = [], isLoading: isLoadingPlayers } = usePlayersForWeek(
    currentWeekId || null,
    activeSeason?.id || null,
    undefined // Get all players, filter by position in component
  );
  
  // Filter players by selected position (tab behavior - single selection)
  const players = useMemo(() => {
    const selectedPosition = selectedPositions[0];
    if (!selectedPosition) {
      return allPlayers;
    }
    return allPlayers.filter(p => p.position === selectedPosition);
  }, [allPlayers, selectedPositions]);

  // Use draft roster for team player tracking (includes unsaved changes)
  const teamPlayerIds = useMemo(() => {
    return new Set(draftRoster.map(p => p.playerId));
  }, [draftRoster]);

  // Get player details map for transfers
  const playersMap = useMemo(() => {
    const map = new Map<string, { firstName: string; lastName: string }>();
    allPlayers.forEach(p => {
      map.set(p.id, { firstName: p.first_name, lastName: p.last_name });
    });
    return map;
  }, [allPlayers]);

  // Create players map with full PlayerWithValue for validation
  const playersValueMap = useMemo(() => {
    const map = new Map<string, PlayerWithValue>();
    allPlayers.forEach(p => {
      map.set(p.id, p);
    });
    return map;
  }, [allPlayers]);

  // Filter transfers for selected team
  const teamTransfers = useMemo(() => {
    return weekTransfers.filter(t => t.fantasy_team_id === selectedTeamId);
  }, [weekTransfers, selectedTeamId]);

  // Build pitch players from draft roster (includes unsaved changes)
  const pitchPlayers = useMemo(() => {
    return draftRoster.map(sp => ({
      playerId: sp.playerId,
      position: sp.position,
      isBenched: sp.isBenched,
      isCaptain: sp.isCaptain,
      player: allPlayers.find(p => p.id === sp.playerId),
    }));
  }, [draftRoster, allPlayers]);

  // Calculate transfers used
  const transfersUsed = teamTransfers.length;
  const transfersRemaining = remainingTransfers ?? 0;

  // Calculate salary from draft roster
  const selectedTeam = fantasyTeams.find(t => t.id === selectedTeamId);
  const salary = useMemo(() => {
    let total = 0;
    for (const player of draftRoster) {
      const playerData = playersValueMap.get(player.playerId);
      if (playerData) {
        total += playerData.currentValue;
      }
    }
    return total;
  }, [draftRoster, playersValueMap]);

  const createSnapshotMutation = useCreateSnapshot();
  const addPlayerMutation = useAddPlayerToFantasyTeam();
  const updateTeamMutation = useUpdateFantasyTeam();
  const executeTransferMutation = useExecuteTransfer();

  // Configure sensors for better drag performance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    })
  );

  const [activePlayer, setActivePlayer] = useState<PlayerWithValue | null>(null);
  const [activePositionPlayer, setActivePositionPlayer] = useState<DraftRosterPlayer | null>(null);

  // Warn before leaving page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but we still need to call preventDefault
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Intercept browser back/forward navigation
  useEffect(() => {
    if (!hasUnsavedChanges) {
      // Reset guard state flag when no unsaved changes
      hasGuardState.current = false;
      return;
    }

    const handlePopState = () => {
      if (hasUnsavedChanges && hasGuardState.current) {
        // Push the state back to prevent navigation
        window.history.pushState(null, '', window.location.pathname);
        setShowNavigateAwayDialog(true);
      }
    };

    // Push a state when we have unsaved changes so we can detect back button
    // Only do this once per unsaved changes session
    if (!hasGuardState.current) {
      window.history.pushState(null, '', window.location.pathname);
      hasGuardState.current = true;
    }

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges]);

  // Handle navigation confirmation dialog actions
  const handleConfirmNavigateAway = useCallback(() => {
    setShowNavigateAwayDialog(false);
    const navPath = pendingNavigation;
    setPendingNavigation(null);
    
    // Clear unsaved changes flag and guard state
    setHasUnsavedChanges(false);
    hasGuardState.current = false;
    
    if (navPath) {
      // Programmatic navigation
      router.push(navPath);
    } else {
      // Browser back/forward - allow navigation by going back
      // Remove the guard state we added, then navigate back
      window.history.back();
    }
  }, [router, pendingNavigation]);

  const handleCancelNavigateAway = useCallback(() => {
    setShowNavigateAwayDialog(false);
    setPendingNavigation(null);
  }, []);

  // Helper function to navigate with unsaved changes check
  const navigateWithCheck = useCallback((path: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(path);
      setShowNavigateAwayDialog(true);
    } else {
      router.push(path);
    }
  }, [hasUnsavedChanges, router]);

  // Validate roster whenever it changes
  // Always require complete roster (10 players: 4 handlers, 3 cutters, 3 receivers, and a captain)
  useEffect(() => {
    if (draftRoster.length === 0) {
      // Use functional update to check current state and only update if not empty
      setValidationErrors((prevErrors) => {
        if (prevErrors.length === 0) {
          return prevErrors; // Return same reference to prevent re-render
        }
        return [];
      });
      return;
    }

    // Always validate for complete roster (allowPartial = false)
    const validation = validateFantasyTeam(draftRoster, playersValueMap, false);
    
    // Use functional update to compare and only update if changed
    setValidationErrors((prevErrors) => {
      // Compare by length first (fast check)
      if (validation.errors.length !== prevErrors.length) {
        return validation.errors;
      }
      
      // Compare by content if lengths match
      if (validation.errors.some((err, idx) => err !== prevErrors[idx])) {
        return validation.errors;
      }
      
      return prevErrors; // Return same reference to prevent re-render
    });
  }, [draftRoster, playersValueMap]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    
    if (data?.type === 'player') {
      // Dragging from player list
      setActivePlayer(data.player);
      setActivePositionPlayer(null);
    } else if (data?.type === 'position-player' && data.player) {
      // Dragging from position circle
      setActivePlayer(data.player);
      setActivePositionPlayer(data.positionPlayer || null);
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    setActivePlayer(null);
    setActivePositionPlayer(null);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Track drag over state for visual feedback
    // The activePlayer state already contains the dragged player info
  }, []);

  const handleAddPlayer = useCallback((playerId: string) => {
    if (!selectedTeamId || !currentWeekId) return;

    const player = allPlayers.find(p => p.id === playerId);
    if (!player || !player.position) {
      return; // Player must have a position
    }

    const playerPosition = player.position as FantasyPosition;

    // Check if player already in draft roster
    setDraftRoster((prevRoster) => {
      if (prevRoster.some(p => p.playerId === playerId)) {
        toast.error('Player is already on your team');
        return prevRoster;
      }

      const maxPlayersPerPosition = getMaxPlayersPerPosition();
      const positionLimits = maxPlayersPerPosition[playerPosition];

      // Check position limits
      const positionPlayersOnField = prevRoster.filter(
        p => p.position === playerPosition && !p.isBenched
      );
      const positionPlayersOnBench = prevRoster.filter(
        p => p.position === playerPosition && p.isBenched
      );

      let newRoster: DraftRosterPlayer[];
      
      if (positionPlayersOnField.length >= positionLimits.starting) {
        // Field is full, check bench
        if (positionPlayersOnBench.length >= positionLimits.bench) {
          toast.error(`Cannot add more ${playerPosition}s. Maximum ${positionLimits.starting} on field and ${positionLimits.bench} on bench.`);
          return prevRoster;
        }
        // Add to bench
        newRoster = [...prevRoster, {
          playerId: player.id,
          position: playerPosition,
          isBenched: true,
          isCaptain: false,
        }];
      } else {
        // Add to starting lineup
        newRoster = [...prevRoster, {
          playerId: player.id,
          position: playerPosition,
          isBenched: false,
          isCaptain: false,
        }];
      }

      // Ensure we have at least one captain
      const hasCaptain = newRoster.some(p => p.isCaptain);
      if (!hasCaptain && newRoster.length > 0) {
        const highestValueIndex = newRoster
          .map((p, idx) => ({ ...p, idx, value: allPlayers.find(pl => pl.id === p.playerId)?.currentValue || 0 }))
          .sort((a, b) => b.value - a.value)[0]?.idx;
        if (highestValueIndex !== undefined) {
          newRoster[highestValueIndex].isCaptain = true;
        }
      }

      setHasUnsavedChanges(true);
      return newRoster;
    });
  }, [selectedTeamId, currentWeekId, allPlayers]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActivePlayer(null);
    setActivePositionPlayer(null);
    
    if (!over || !selectedTeamId || !currentWeekId) {
      return;
    }

    const activeData = active.data.current;
    const isPositionDrag = activeData?.type === 'position-player';
    
    // Get player from active data - either from player list or position circle
    const player = activeData?.player as PlayerWithValue | undefined;
    if (!player || !player.position) {
      return;
    }
    
    // Validate player position is valid
    if (!['handler', 'cutter', 'receiver'].includes(player.position)) {
      toast.error(`Invalid player position: ${player.position}`);
      return;
    }

    const dropZoneId = over.id.toString();
    
    // Parse drop zone (e.g., "position-handler-1" or "bench-handler-0")
    const fieldMatch = dropZoneId.match(/^position-(handler|cutter|receiver)-(\d+)$/);
    const benchMatch = dropZoneId.match(/^bench-(handler|cutter|receiver)-(\d+)$/);
    
    if (!fieldMatch && !benchMatch) {
      return;
    }

    const isBench = !!benchMatch;
    const match = fieldMatch || benchMatch;
    const [, targetPosition, slotIndexStr] = match!;
    const slotIndex = parseInt(slotIndexStr, 10);
    
    // Check if player position matches target position
    if (player.position !== targetPosition) {
      toast.error(`Cannot place ${player.position} in ${targetPosition} position`);
      return;
    }

    // If dragging from a position circle, handle reordering/swapping
    if (isPositionDrag && activeData.positionPlayer) {
      const sourcePositionPlayer = activeData.positionPlayer as DraftRosterPlayer;
      const sourceDropId = activeData.dropId as string;
      
      // Check if dropping on the same slot (no-op)
      if (sourceDropId === dropZoneId) {
        return;
      }
      
      setDraftRoster((prevRoster) => {
        // Find what player (if any) is at the target drop location
        const targetPositionPlayers = prevRoster.filter(p => p.position === targetPosition);
        let targetPlayer: DraftRosterPlayer | undefined;
        
        if (isBench) {
          const benchPlayers = targetPositionPlayers.filter(p => p.isBenched);
          targetPlayer = benchPlayers[slotIndex];
        } else {
          const fieldPlayers = targetPositionPlayers.filter(p => !p.isBenched);
          targetPlayer = fieldPlayers[slotIndex];
        }
        
        // Remove source and target from roster
        const newRoster = prevRoster.filter(
          p => p.playerId !== sourcePositionPlayer.playerId && 
               (!targetPlayer || p.playerId !== targetPlayer.playerId)
        );
        
        // Process each position to rebuild in correct order
        const positions: FantasyPosition[] = ['handler', 'cutter', 'receiver'];
        const maxPlayersPerPosition = getMaxPlayersPerPosition();
        const finalRoster: DraftRosterPlayer[] = [];
        
        for (const pos of positions) {
          const positionPlayers = newRoster.filter(p => p.position === pos);
          const fieldPlayers = positionPlayers.filter(p => !p.isBenched);
          const benchPlayers = positionPlayers.filter(p => p.isBenched);
          
          if (pos === targetPosition) {
            // This is the target position - insert source and handle target swap
            const positionLimits = maxPlayersPerPosition[pos];
            
            if (isBench) {
              // Moving to bench
              // Add source to bench at correct slot
              const updatedBench = [...benchPlayers];
              updatedBench.splice(Math.min(slotIndex, updatedBench.length), 0, {
                ...sourcePositionPlayer,
                isBenched: true,
              });
              
              // If target exists and was swapping, add target to source's old position
              if (targetPlayer && targetPlayer.playerId !== sourcePositionPlayer.playerId) {
                if (sourcePositionPlayer.isBenched) {
                  // Source was on bench, target goes to bench (simple swap)
                  // Already handled above
                } else {
                  // Source was on field, target goes to field
                  const updatedField = [...fieldPlayers, { ...targetPlayer, isBenched: false }];
                  finalRoster.push(...updatedField.slice(0, positionLimits.starting));
                  
                  // Excess to bench
                  const excess = updatedField.slice(positionLimits.starting).map(p => ({ ...p, isBenched: true }));
                  updatedBench.push(...excess);
                }
              } else {
                // No target, just add field players
                finalRoster.push(...fieldPlayers.slice(0, positionLimits.starting));
              }
              
              finalRoster.push(...updatedBench.slice(0, positionLimits.bench));
            } else {
              // Moving to field
              if (targetPlayer && targetPlayer.playerId !== sourcePositionPlayer.playerId) {
                if (targetPlayer.isBenched) {
                  // Target was on bench, source goes to field at slotIndex, target goes to bench
                  const updatedField = [...fieldPlayers, { ...sourcePositionPlayer, isBenched: false }];
                  // Reorder to place source at slotIndex
                  const sourceIndex = updatedField.findIndex(p => p.playerId === sourcePositionPlayer.playerId);
                  if (sourceIndex !== -1 && sourceIndex !== slotIndex) {
                    updatedField.splice(sourceIndex, 1);
                    updatedField.splice(Math.min(slotIndex, updatedField.length), 0, { ...sourcePositionPlayer, isBenched: false });
                  }
                  const starting = updatedField.slice(0, positionLimits.starting);
                  const excess = updatedField.slice(positionLimits.starting).map(p => ({ ...p, isBenched: true }));
                  
                  // Add target to bench
                  const updatedBench = [...benchPlayers, { ...targetPlayer, isBenched: true }];
                  
                  finalRoster.push(...starting);
                  finalRoster.push(...excess, ...updatedBench.slice(0, positionLimits.bench));
                } else {
                  // Both on field - swap their positions
                  // Get all field players for this position in current order from original roster
                  const allFieldPlayers = prevRoster.filter(p => p.position === pos && !p.isBenched);
                  
                  // Find indices of source and target in the original array
                  const sourceIndex = allFieldPlayers.findIndex(p => p.playerId === sourcePositionPlayer.playerId);
                  const targetIndex = allFieldPlayers.findIndex(p => p.playerId === targetPlayer.playerId);
                  
                  if (sourceIndex !== -1 && targetIndex !== -1) {
                    // Create new array by copying and swapping
                    const swappedField = allFieldPlayers.map((p, idx) => {
                      if (idx === sourceIndex) {
                        // Put target at source's position
                        return { ...targetPlayer, isBenched: false, isCaptain: targetPlayer.isCaptain };
                      } else if (idx === targetIndex) {
                        // Put source at target's position
                        return { ...sourcePositionPlayer, isBenched: false, isCaptain: sourcePositionPlayer.isCaptain };
                      }
                      return p;
                    });
                    
                    const starting = swappedField.slice(0, positionLimits.starting);
                    const excess = swappedField.slice(positionLimits.starting).map(p => ({ ...p, isBenched: true }));
                    
                    finalRoster.push(...starting);
                    finalRoster.push(...benchPlayers, ...excess.slice(0, positionLimits.bench));
                  } else {
                    // Fallback - shouldn't happen, but add both back
                    const updatedField = [...fieldPlayers, 
                      { ...sourcePositionPlayer, isBenched: false },
                      { ...targetPlayer, isBenched: false }
                    ];
                    const starting = updatedField.slice(0, positionLimits.starting);
                    const excess = updatedField.slice(positionLimits.starting).map(p => ({ ...p, isBenched: true }));
                    finalRoster.push(...starting);
                    finalRoster.push(...benchPlayers, ...excess);
                  }
                }
              } else {
                // No target player, just move source to field
                const updatedField = [...fieldPlayers, { ...sourcePositionPlayer, isBenched: false }];
                const starting = updatedField.slice(0, positionLimits.starting);
                const excess = updatedField.slice(positionLimits.starting).map(p => ({ ...p, isBenched: true }));
                
                finalRoster.push(...starting);
                finalRoster.push(...benchPlayers, ...excess);
              }
            }
          } else {
            // Other positions - keep as-is, but add target if it's moving here
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
        
        // Preserve captain status
        if (sourcePositionPlayer.isCaptain) {
          finalRoster.forEach(p => {
            p.isCaptain = p.playerId === sourcePositionPlayer.playerId;
          });
        } else {
          // Ensure exactly one captain
          const captains = finalRoster.filter(p => p.isCaptain);
          if (captains.length === 0 && finalRoster.length > 0) {
            const highestValue = finalRoster.map((p, idx) => ({
              ...p,
              idx,
              value: allPlayers.find(pl => pl.id === p.playerId)?.currentValue || 0,
            })).sort((a, b) => b.value - a.value)[0];
            if (highestValue) {
              finalRoster[highestValue.idx].isCaptain = true;
            }
          } else if (captains.length > 1) {
            const captainsWithValues = captains.map(p => ({
              ...p,
              value: allPlayers.find(pl => pl.id === p.playerId)?.currentValue || 0,
            }));
            captainsWithValues.sort((a, b) => b.value - a.value);
            const captainToKeep = captainsWithValues[0].playerId;
            finalRoster.forEach(p => {
              p.isCaptain = p.playerId === captainToKeep;
            });
          }
        }

        setHasUnsavedChanges(true);
        return finalRoster;
      });
      
      return; // Early return for position drag handling
    }

    const maxPlayersPerPosition = getMaxPlayersPerPosition();
    const positionLimits = maxPlayersPerPosition[targetPosition as FantasyPosition];

    // Get current players at target position
    setDraftRoster((prevRoster) => {
      const currentPlayersAtPosition = prevRoster.filter(
        p => p.position === targetPosition
      );
      const fieldPlayersAtPosition = currentPlayersAtPosition.filter(p => !p.isBenched);
      const benchPlayersAtPosition = currentPlayersAtPosition.filter(p => p.isBenched);

      // Check if this is a reorder (player already on team) or a new add
      const isPlayerOnTeam = prevRoster.some(p => p.playerId === player.id);
      
      // Build new roster
      let newRoster: DraftRosterPlayer[] = [];

      // Process each position
      const positions: FantasyPosition[] = ['handler', 'cutter', 'receiver'];
      
      for (const pos of positions) {
        if (pos === targetPosition) {
          // Target position - handle the drop
          const otherPlayersAtPos = prevRoster.filter(
            p => p.position === pos && p.playerId !== player.id
          );
          
          if (isBench) {
            // Dropping to bench
            if (benchPlayersAtPosition.length >= positionLimits.bench) {
              toast.error(`Cannot add more ${targetPosition}s to bench. Maximum ${positionLimits.bench} allowed.`);
              return prevRoster;
            }
            
            // Keep field players as-is, add to bench
            const fieldPlayers = otherPlayersAtPos.filter(p => !p.isBenched).slice(0, positionLimits.starting);
            const benchPlayers = otherPlayersAtPos.filter(p => p.isBenched);
            
            newRoster.push(...fieldPlayers);
            newRoster.push({
              playerId: player.id,
              position: targetPosition as FantasyPosition,
              isBenched: true,
              isCaptain: false,
            });
            newRoster.push(...benchPlayers);
          } else {
            // Dropping to field
            // Build sorted list of current field players at this position
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
            
            // Insert dragged player at target slot
            sortedFieldPlayers.splice(slotIndex, 0, {
              player: {
                playerId: player.id,
                position: targetPosition as FantasyPosition,
                isBenched: false,
                isCaptain: false,
              },
              slot: slotIndex,
            });
            
            // Take max players for starting lineup
            const starting = sortedFieldPlayers.slice(0, positionLimits.starting).map(p => p.player);
            // Remaining players go to bench (if bench has space)
            const remaining = sortedFieldPlayers.slice(positionLimits.starting);
            const benched = [];
            for (const item of remaining) {
              if (benchPlayersAtPosition.length + benched.length < positionLimits.bench) {
                benched.push({ ...item.player, isBenched: true });
              } else {
                // Bench is full, can't add this player
                toast.error(`Cannot add more ${targetPosition}s. Field and bench are full.`);
                return prevRoster;
              }
            }
            
            // Add existing bench players
            const existingBench = otherPlayersAtPos.filter(p => p.isBenched);
            
            newRoster.push(...starting);
            newRoster.push(...benched);
            newRoster.push(...existingBench);
          }
        } else {
          // Other positions - keep as-is
          newRoster.push(...prevRoster.filter(p => p.position === pos));
        }
      }
      
      // If player wasn't on team and wasn't added above, add them
      if (!isPlayerOnTeam && !newRoster.some(p => p.playerId === player.id)) {
        // Player was dragged to wrong position or couldn't be added - add to bench if space available
        const playerPos = player.position as FantasyPosition;
        const positionLimitsForPlayer = maxPlayersPerPosition[playerPos];
        const benchPlayersForPlayer = prevRoster.filter(
          p => p.position === playerPos && p.isBenched
        );
        
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

      // Ensure we have exactly one captain
      const captains = newRoster.filter(p => p.isCaptain);
      if (captains.length === 0 && newRoster.length > 0) {
        // Make highest value player captain
        const playersWithValues = newRoster.map((p, idx) => ({
          ...p,
          idx,
          value: allPlayers.find(pl => pl.id === p.playerId)?.currentValue || 0,
        }));
        playersWithValues.sort((a, b) => b.value - a.value);
        if (playersWithValues[0]) {
          newRoster[playersWithValues[0].idx].isCaptain = true;
        }
      } else if (captains.length > 1) {
        // Keep only the highest value captain
        const captainsWithValues = captains.map(p => ({
          ...p,
          value: allPlayers.find(pl => pl.id === p.playerId)?.currentValue || 0,
        }));
        captainsWithValues.sort((a, b) => b.value - a.value);
        const captainToKeep = captainsWithValues[0].playerId;
        newRoster.forEach(p => {
          p.isCaptain = p.playerId === captainToKeep;
        });
      }

      setHasUnsavedChanges(true);
      return newRoster;
    });
  }, [selectedTeamId, currentWeekId, pitchPlayers, allPlayers]);

  const handleSave = useCallback(async () => {
    if (!selectedTeamId || !currentWeekId) {
      return;
    }

    // Always validate for complete roster: 10 players (4 handlers, 3 cutters, 3 receivers) and a captain
    const validation = validateFantasyTeam(draftRoster, playersValueMap, false);
    
    if (!validation.valid) {
      // Show all validation errors (also shown in header)
      const errorMessage = validation.errors.join('\n');
      toast.error(`Cannot save team:\n${errorMessage}`, {
        duration: 5000,
      });
      return;
    }

    try {
      // Always require complete roster when saving (allowPartial = false)
      await createSnapshotMutation.mutateAsync({
        fantasyTeamId: selectedTeamId,
        weekId: currentWeekId,
        players: draftRoster,
        allowPartial: false,
      });
      
      setHasUnsavedChanges(false);
      setValidationErrors([]);
    } catch (error: any) {
      // Error toast is handled by mutation's onError
    }
  }, [selectedTeamId, currentWeekId, draftRoster, playersValueMap, createSnapshotMutation]);

  // Show loading state
  if (isLoadingAuth) {
    return (
      <div className={styles.container}>
        <div>Loading...</div>
      </div>
    );
  }

  // Show sign-up prompt if not authenticated
  if (!user) {
    return (
      <div className={styles.container}>
        <Card>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
              Sign Up to Manage Your Fantasy Team
            </h1>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
              You need to be signed in to create and manage your fantasy team.
            </p>
            <DiscordLogin />
          </div>
        </Card>
      </div>
    );
  }

  // Show team creation prompt if authenticated but no team
  if (fantasyTeams.length === 0) {
    return (
      <div className={styles.container}>
        <Card>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
              Create Your Fantasy Team
            </h1>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
              You don't have a fantasy team yet. Create one to start managing your players.
            </p>
            <button
              onClick={() => router.push('/admin/fantasy-teams')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Create Team (Admin Panel)
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (!activeSeason) {
    return (
      <div className={styles.container}>
        <h1>Fantasy Teams</h1>
        <p>No active season found. Please create a season first.</p>
      </div>
    );
  }

  if (!selectedWeek) {
    return (
      <div className={styles.container}>
        <h1>My Fantasy Team</h1>
        <p>No weeks available for this season.</p>
      </div>
    );
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
        {/* Debug JSON Display */}
        <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <details style={{ cursor: 'pointer' }}>
            <summary style={{ fontWeight: 600, marginBottom: '0.5rem', userSelect: 'none' }}>
              Fantasy Team JSON (Debug)
            </summary>
            <div style={{ marginTop: '0.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Draft Roster:</h4>
              <pre style={{ 
                backgroundColor: '#f3f4f6', 
                padding: '0.75rem', 
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: '300px'
              }}>
                {JSON.stringify(draftRoster, null, 2)}
              </pre>
            </div>
          </details>
        </Card>

        <TeamSelectionHeader
          week={selectedWeek}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          teamName={selectedTeam?.name || ''}
          teamId={selectedTeamId || ''}
          onTeamNameUpdate={async (newName: string) => {
            if (!selectedTeamId || !newName.trim()) return;
            await updateTeamMutation.mutateAsync({
              fantasyTeamId: selectedTeamId,
              updates: { name: newName.trim() },
            });
          }}
          isUpdatingTeamName={updateTeamMutation.isPending}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={handleSave}
          isSaving={createSnapshotMutation.isPending}
          validationErrors={validationErrors}
        />

        <div className={styles.content}>
          <div className={styles.leftPanel}>
          <PlayerList
            players={players}
            selectedPositions={selectedPositions}
            onPositionChange={setSelectedPositions}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            teamPlayerIds={teamPlayerIds}
            onAddPlayer={handleAddPlayer}
            isLoading={isLoadingPlayers}
          />
          </div>

          <div className={styles.rightPanel}>
            <TeamOverview
              transfersUsed={transfersUsed}
              transfersRemaining={transfersRemaining}
              playerCount={draftRoster.filter(p => !p.isBenched).length}
              maxPlayers={10}
              salary={salary}
              salaryCap={450}
              pitchPlayers={pitchPlayers}
              draggedPlayerPosition={activePlayer?.position || null}
            />

            <TransfersList
              transfers={teamTransfers}
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
        {activePlayer && activePositionPlayer ? (
          // Dragging from position circle - show position circle
          <div
            className={positionStyles.position}
            style={{
              opacity: 0.95,
              transform: 'rotate(2deg) scale(1.05)',
              cursor: 'grabbing',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
              border: '2px solid rgba(59, 130, 246, 1)',
            }}
          >
            <div className={positionStyles.positionIndicator}>
              {getPositionCode(activePositionPlayer.position)}
            </div>
            {(() => {
              const jerseyPath = getTeamJerseyPath(activePlayer.teamSlug || activePlayer.teamName);
              return jerseyPath ? (
                <div className={positionStyles.jerseyContainer}>
                  <Image
                    src={jerseyPath}
                    alt={activePlayer.teamSlug || activePlayer.teamName || 'Team jersey'}
                    className={positionStyles.jerseyImage}
                    width={48}
                    height={48}
                  />
                </div>
              ) : (
                <div className={positionStyles.jerseyPlaceholder} />
              );
            })()}
            <div className={positionStyles.playerName}>
              {formatPlayerName(activePlayer.first_name, activePlayer.last_name)}
            </div>
          </div>
        ) : activePlayer ? (
          // Dragging from player list - show player card
          <div
            style={{
              opacity: 0.95,
              transform: 'rotate(2deg) scale(1.02)',
              cursor: 'grabbing',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <PlayerCard player={activePlayer} isOnTeam={false} />
          </div>
        ) : null}
      </DragOverlay>

      {/* Navigation confirmation dialog */}
      <Modal
        isOpen={showNavigateAwayDialog}
        onClose={handleCancelNavigateAway}
        title="Unsaved Changes"
        width="400px"
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ marginBottom: '1rem', color: '#374151' }}>
            You have unsaved changes to your team. Are you sure you want to leave? Your changes will be lost.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancelNavigateAway}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmNavigateAway}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Leave Without Saving
          </button>
        </div>
      </Modal>
    </DndContext>
  );
}
