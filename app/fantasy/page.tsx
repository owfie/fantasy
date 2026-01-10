'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useActiveSeason, useFantasyTeams, useAddPlayerToFantasyTeam, useUpdateFantasyTeam } from '@/lib/queries/fantasy-teams-test.queries';
import { useSnapshotForWeek, useSnapshotWithPlayers, useCreateSnapshot } from '@/lib/queries/fantasy-snapshots.queries';
import { useRemainingTransfers, useIsFirstWeek, useTransfersByWeek, UNLIMITED_TRANSFERS } from '@/lib/queries/transfers.queries';
import { useWeeks } from '@/lib/queries/seasons.queries';
import { usePlayersForWeek } from '@/lib/queries/players.queries';
import { FantasyPosition } from '@/lib/domain/types';
import { TeamSelectionHeader } from '@/components/FantasyTeamSelection/TeamSelectionHeader';
import { PlayerList } from '@/components/FantasyTeamSelection/PlayerList';
import { TeamOverview } from '@/components/FantasyTeamSelection/TeamOverview';
import { TransfersList } from '@/components/FantasyTeamSelection/TransfersList';
import { PlayerCard } from '@/components/FantasyTeamSelection/PlayerCard';
import { PlayerWithValue } from '@/lib/api/players.api';
import { formatCurrency } from '@/lib/utils/fantasy-utils';
import { DiscordLogin } from '@/components/discord-login';
import { Card } from '@/components/Card';
import styles from './page.module.scss';

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
      if (!selectedTeamId || !fantasyTeams.find(t => t.id === selectedTeamId)) {
        setSelectedTeamId(fantasyTeams[0]?.id || null);
      }
    } else {
      setSelectedTeamId(null);
    }
  }, [fantasyTeams, selectedTeamId]);

  const { data: weeks = [] } = useWeeks(activeSeason?.id || '');
  
  // Auto-select first week if available
  const firstWeekId = weeks[0]?.id || null;
  const currentWeekId = selectedWeekId || firstWeekId;
  const selectedWeek = weeks.find(w => w.id === currentWeekId) || weeks[0];

  const { data: snapshot } = useSnapshotForWeek(selectedTeamId || '', currentWeekId || '');
  const { data: snapshotWithPlayers } = useSnapshotWithPlayers(snapshot?.id || '');
  const { data: remainingTransfers } = useRemainingTransfers(selectedTeamId || '', currentWeekId || '');
  const { data: isFirstWeek } = useIsFirstWeek(selectedTeamId || '', currentWeekId || '');
  const { data: weekTransfers = [] } = useTransfersByWeek(currentWeekId || '');
  // For API call, if all positions selected, pass undefined. Otherwise, we'll filter client-side.
  // Since usePlayersForWeek only accepts single position, we'll get all players and filter client-side
  const { data: allPlayers = [] } = usePlayersForWeek(
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

  // Get current team players (from snapshot or fantasy_team_players)
  // If no snapshot exists, we'll need to get from fantasy_team_players
  const currentRoster = useMemo(() => {
    if (snapshotWithPlayers?.players && snapshotWithPlayers.players.length > 0) {
      return snapshotWithPlayers.players;
    }
    // If no snapshot, return empty array (team not yet set up for this week)
    return [];
  }, [snapshotWithPlayers]);

  const teamPlayerIds = useMemo(() => {
    return new Set(currentRoster.map(p => p.player_id));
  }, [currentRoster]);

  // Get player details map for transfers
  const playersMap = useMemo(() => {
    const map = new Map<string, { firstName: string; lastName: string }>();
    players.forEach(p => {
      map.set(p.id, { firstName: p.first_name, lastName: p.last_name });
    });
    return map;
  }, [players]);

  // Filter transfers for selected team
  const teamTransfers = useMemo(() => {
    return weekTransfers.filter(t => t.fantasy_team_id === selectedTeamId);
  }, [weekTransfers, selectedTeamId]);

  // Build pitch players from snapshot
  const pitchPlayers = useMemo(() => {
    return currentRoster.map(sp => ({
      playerId: sp.player_id,
      position: sp.position as FantasyPosition,
      isBenched: sp.is_benched,
      isCaptain: sp.is_captain,
      player: players.find(p => p.id === sp.player_id),
    }));
  }, [currentRoster, players]);

  // Calculate transfers used
  const transfersUsed = teamTransfers.length;
  const transfersRemaining = remainingTransfers ?? 0;

  // Calculate salary from snapshot or team
  const selectedTeam = fantasyTeams.find(t => t.id === selectedTeamId);
  const salary = snapshot?.total_value ?? selectedTeam?.total_value ?? 0;

  const createSnapshotMutation = useCreateSnapshot();
  const addPlayerMutation = useAddPlayerToFantasyTeam();
  const updateTeamMutation = useUpdateFantasyTeam();

  // Configure sensors for better drag performance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    })
  );

  const [activePlayer, setActivePlayer] = useState<PlayerWithValue | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'player') {
      setActivePlayer(active.data.current.player);
    }
  };

  const handleDragCancel = () => {
    setActivePlayer(null);
  };

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

  const handleAddPlayer = async (playerId: string) => {
    if (!selectedTeamId || !currentWeekId) return;

    const player = players.find(p => p.id === playerId);
    if (!player || !player.position) {
      return; // Player must have a position
    }

    // If first week or no snapshot exists, add to team and create snapshot
    if (isFirstWeek || !snapshot) {
      // Add player to fantasy team
      try {
        await addPlayerMutation.mutateAsync({
          fantasyTeamId: selectedTeamId,
          playerId,
          isBench: false,
        });

        // After adding, create/update snapshot with all players
        // We'll need to refetch the team players first
        // For now, just invalidate queries to trigger refetch
        return;
      } catch (error) {
        console.error('Failed to add player:', error);
        return;
      }
    }

    // For subsequent weeks, add player to snapshot
    const updatedRoster = [...currentRoster];
    
    // Check if player already in roster
    if (updatedRoster.some(p => p.player_id === playerId)) {
      return; // Already on team
    }

    // Add player to appropriate position slot
    const positionPlayers = updatedRoster.filter(p => p.position === player.position && !p.is_benched);
    const maxPlayersPerPosition: Record<FantasyPosition, number> = {
      handler: 4,
      cutter: 3,
      receiver: 3,
    };
    
    if (positionPlayers.length >= maxPlayersPerPosition[player.position]) {
      // Position is full, add to bench
      updatedRoster.push({
        player_id: playerId,
        position: player.position,
        is_benched: true,
        is_captain: false,
      } as any);
    } else {
      // Add to starting lineup
      updatedRoster.push({
        player_id: playerId,
        position: player.position,
        is_benched: false,
        is_captain: false,
      } as any);
    }

    // Convert to snapshot format and create/update
    const snapshotPlayers = updatedRoster.map(sp => ({
      playerId: sp.player_id,
      position: sp.position as FantasyPosition,
      isBenched: sp.is_benched,
      isCaptain: sp.is_captain,
    }));

    createSnapshotMutation.mutate({
      fantasyTeamId: selectedTeamId,
      weekId: currentWeekId,
      players: snapshotPlayers,
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePlayer(null);
    
    if (!over || !selectedTeamId || !currentWeekId) {
      return;
    }

    // Get player from active data
    const player = active.data.current?.player as PlayerWithValue | undefined;
    if (!player || !player.position) {
      console.log('No player or position found in drag data');
      return;
    }

    const dropZoneId = over.id.toString();
    console.log('Drop zone:', dropZoneId);
    
    // Parse drop zone (e.g., "position-handler-1" or "bench-handler-0")
    const fieldMatch = dropZoneId.match(/^position-(handler|cutter|receiver)-(\d+)$/);
    const benchMatch = dropZoneId.match(/^bench-(handler|cutter|receiver)-(\d+)$/);
    
    if (!fieldMatch && !benchMatch) {
      console.log('Invalid drop zone format:', dropZoneId);
      return;
    }

    const isBench = !!benchMatch;
    const match = fieldMatch || benchMatch;
    const [, targetPosition, slotIndexStr] = match!;
    const slotIndex = parseInt(slotIndexStr, 10);
    
    // Check if player position matches target position
    if (player.position !== targetPosition) {
      console.log(`Position mismatch: player is ${player.position}, target is ${targetPosition}`);
      return;
    }

    // If first week or no snapshot, add to team first then create snapshot
    if (isFirstWeek || !snapshot) {
      try {
        // Add player to fantasy team if not already on it
        const isAlreadyOnTeam = currentRoster.some(p => p.player_id === player.id);
        if (!isAlreadyOnTeam) {
          await addPlayerMutation.mutateAsync({
            fantasyTeamId: selectedTeamId,
            playerId: player.id,
            isBench: false,
          });
        }
        
        // Refetch to get updated roster, then create snapshot
        // For now, just create snapshot with current roster + new player
        const updatedRoster = isAlreadyOnTeam 
          ? currentRoster 
          : [...currentRoster, {
              player_id: player.id,
              position: player.position,
              is_benched: false,
              is_captain: false,
            } as any];
        
        const snapshotPlayers = updatedRoster.map(sp => ({
          playerId: sp.player_id,
          position: sp.position as FantasyPosition,
          isBenched: sp.is_benched || false,
          isCaptain: sp.is_captain || false,
        }));
        
        // Ensure captain exists
        if (!snapshotPlayers.some(p => p.isCaptain) && snapshotPlayers.length > 0) {
          const highestValueIndex = snapshotPlayers
            .map((p, idx) => ({ ...p, idx, value: players.find(pl => pl.id === p.playerId)?.currentValue || 0 }))
            .sort((a, b) => b.value - a.value)[0]?.idx;
          if (highestValueIndex !== undefined) {
            snapshotPlayers[highestValueIndex].isCaptain = true;
          }
        }
        
        createSnapshotMutation.mutate({
          fantasyTeamId: selectedTeamId,
          weekId: currentWeekId,
          players: snapshotPlayers,
        });
        return;
      } catch (error) {
        console.error('Failed to add player:', error);
        return;
      }
    }

    // For subsequent weeks with existing snapshot
    // Build updated roster starting from current snapshot
    const updatedRoster: Array<{
      player_id: string;
      position: FantasyPosition;
      is_benched: boolean;
      is_captain: boolean;
    }> = [];
    
    // Get max players per position on field (2 receivers, 2 cutters, 3 handlers)
    const maxPlayersOnField: Record<FantasyPosition, number> = {
      handler: 3,
      cutter: 2,
      receiver: 2,
    };
    
    // Process each position
    const positions: FantasyPosition[] = ['handler', 'cutter', 'receiver'];
    for (const pos of positions) {
      // Get current players at this position (excluding the dragged player)
      const currentPlayersAtPos = currentRoster
        .filter(p => p.position === pos && p.player_id !== player.id);
      
      // If this is the target position, handle the drop
      if (pos === targetPosition) {
        if (isBench) {
          // Dropping to bench - add player to bench for this position
          const fieldPlayers = currentPlayersAtPos.filter(p => !p.is_benched).slice(0, maxPlayersOnField[pos]);
          const benchPlayers = currentPlayersAtPos.filter(p => p.is_benched);
          
          // Add dragged player to bench
          updatedRoster.push(...fieldPlayers);
          updatedRoster.push({
            player_id: player.id,
            position: targetPosition,
            is_benched: true,
            is_captain: false,
          });
          updatedRoster.push(...benchPlayers);
        } else {
          // Dropping to field - insert at specified slot
          interface PlayerWithSlot {
            player_id: string;
            position: FantasyPosition;
            is_benched: boolean;
            is_captain: boolean;
            slot: number;
          }
          
          const sortedPlayers: PlayerWithSlot[] = currentPlayersAtPos
            .filter(p => !p.is_benched)
            .map(p => {
              const slot = pitchPlayers.findIndex(pp => pp.playerId === p.player_id && pp.position === pos && !pp.isBenched);
              return { ...p, slot: slot >= 0 ? slot : 999 };
            })
            .sort((a, b) => a.slot - b.slot);
          
          // Insert dragged player at target slot
          sortedPlayers.splice(slotIndex, 0, {
            player_id: player.id,
            position: targetPosition,
            is_benched: false,
            is_captain: false,
            slot: slotIndex,
          });
          
          // Take max players for starting lineup
          const starting = sortedPlayers.slice(0, maxPlayersOnField[pos]);
          // Remaining players go to bench
          const benched = sortedPlayers.slice(maxPlayersOnField[pos]).map(p => ({ ...p, is_benched: true }));
          // Add any existing bench players for this position
          const existingBench = currentPlayersAtPos.filter(p => p.is_benched);
          
          updatedRoster.push(...starting);
          updatedRoster.push(...benched);
          updatedRoster.push(...existingBench);
        }
      } else {
        // For other positions, keep current players as-is
        const starting = currentPlayersAtPos.filter(p => !p.is_benched).slice(0, maxPlayersOnField[pos]);
        const benched = currentPlayersAtPos.filter(p => p.is_benched);
        updatedRoster.push(...starting, ...benched);
      }
    }
    
    // If player wasn't already on roster and not added above, add to appropriate place
    const isOnRoster = updatedRoster.some(p => p.player_id === player.id);
    if (!isOnRoster && player.position !== targetPosition) {
      // Player was dragged to wrong position - add to bench for their actual position
      updatedRoster.push({
        player_id: player.id,
        position: player.position,
        is_benched: true,
        is_captain: false,
      });
    }

    // Ensure we have exactly one captain
    const captains = updatedRoster.filter(p => p.is_captain);
    if (captains.length === 0 && updatedRoster.length > 0) {
      // Make highest value player captain
      const playersWithValues = updatedRoster.map(p => {
        const pl = players.find(player => player.id === p.player_id);
        return { ...p, value: pl?.currentValue || 0 };
      });
      playersWithValues.sort((a, b) => b.value - a.value);
      if (playersWithValues[0]) {
        playersWithValues[0].is_captain = true;
      }
    } else if (captains.length > 1) {
      // If multiple captains, keep only the highest value one
      const captainsWithValues = captains.map(p => {
        const pl = players.find(player => player.id === p.player_id);
        return { ...p, value: pl?.currentValue || 0 };
      });
      captainsWithValues.sort((a, b) => b.value - a.value);
      updatedRoster.forEach(p => {
        p.is_captain = p.player_id === captainsWithValues[0].player_id;
      });
    }

    // Convert to snapshot format
    const snapshotPlayers = updatedRoster.map(sp => ({
      playerId: sp.player_id,
      position: sp.position,
      isBenched: sp.is_benched,
      isCaptain: sp.is_captain,
    }));

    console.log('Creating snapshot with players:', snapshotPlayers);

    // Create or update snapshot
    createSnapshotMutation.mutate({
      fantasyTeamId: selectedTeamId,
      weekId: currentWeekId,
      players: snapshotPlayers,
    });
  };

  if (!activeSeason) {
    return (
      <div className={styles.container}>
        <h1>Fantasy Teams</h1>
        <p>No active season found. Please create a season first.</p>
      </div>
    );
  }

  if (fantasyTeams.length === 0) {
    return (
      <div className={styles.container}>
        <h1>My Fantasy Team</h1>
        <p>You don't have a fantasy team yet. Please create one in the admin panel.</p>
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
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
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
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Selected Team:</h4>
              <pre style={{ 
                backgroundColor: '#f3f4f6', 
                padding: '0.75rem', 
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: '200px',
                marginBottom: '0.75rem'
              }}>
                {JSON.stringify(fantasyTeams.find(t => t.id === selectedTeamId), null, 2)}
              </pre>
              
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Current Snapshot:</h4>
              <pre style={{ 
                backgroundColor: '#f3f4f6', 
                padding: '0.75rem', 
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: '200px',
                marginBottom: '0.75rem'
              }}>
                {JSON.stringify(snapshot, null, 2)}
              </pre>
              
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Snapshot with Players (Complete):</h4>
              <pre style={{ 
                backgroundColor: '#f3f4f6', 
                padding: '0.75rem', 
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: '300px',
                marginBottom: '0.75rem'
              }}>
                {JSON.stringify(snapshotWithPlayers, null, 2)}
              </pre>
              
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Current Roster (Processed):</h4>
              <pre style={{ 
                backgroundColor: '#f3f4f6', 
                padding: '0.75rem', 
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: '300px',
                marginBottom: '0.75rem'
              }}>
                {JSON.stringify(currentRoster, null, 2)}
              </pre>
              
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Pitch Players (Formatted for Display):</h4>
              <pre style={{ 
                backgroundColor: '#f3f4f6', 
                padding: '0.75rem', 
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: '300px'
              }}>
                {JSON.stringify(pitchPlayers, null, 2)}
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
          />
          </div>

          <div className={styles.rightPanel}>
            <TeamOverview
              transfersUsed={transfersUsed}
              transfersRemaining={transfersRemaining}
              playerCount={currentRoster.filter(p => !p.is_benched).length}
              maxPlayers={10}
              salary={salary}
              salaryCap={450}
              pitchPlayers={pitchPlayers}
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
        {activePlayer ? (
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
    </DndContext>
  );
}
