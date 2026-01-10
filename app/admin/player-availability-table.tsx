'use client';

import { useState, useMemo } from 'react';
import { useActiveSeason } from '@/lib/queries/seasons.queries';
import { useSeasonPlayers } from '@/lib/queries/seasons.queries';
import { useWeeks } from '@/lib/queries/seasons.queries';
import { updatePlayerAvailability, getAvailabilityForSeason, updateSeasonPlayerValue } from '@/lib/api';
import { AvailabilityStatus } from '@/lib/domain/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTeamsIncludingDeleted } from '@/lib/queries/teams.queries';
import { seasonKeys } from '@/lib/queries/seasons.queries';

type SortField = 'name' | 'team' | 'value';
type SortDirection = 'asc' | 'desc';

export function PlayerAvailabilityTable() {
  const { data: activeSeason } = useActiveSeason();
  const { data: seasonPlayers = [] } = useSeasonPlayers(activeSeason?.id || '');
  const { data: weeks = [] } = useWeeks(activeSeason?.id || '');
  const { data: teams = [] } = useTeamsIncludingDeleted();
  const queryClient = useQueryClient();

  // Get active players with their teams
  const activePlayers = useMemo(() => {
    return seasonPlayers
      .filter(sp => sp.is_active && sp.player)
      .map(sp => ({
        id: sp.player_id,
        name: `${sp.player!.first_name} ${sp.player!.last_name}`,
        teamId: sp.team_id || sp.player!.team_id,
        startingValue: sp.starting_value,
        seasonPlayerId: sp.id,
      }))
      .filter(p => p.teamId); // Only show players with teams
  }, [seasonPlayers]);

  // Get all games for all weeks with team information
  const { data: allGames = [] } = useQuery({
    queryKey: ['games', 'all', activeSeason?.id, weeks.map(w => w.id).join(',')],
    queryFn: async () => {
      if (!activeSeason?.id || weeks.length === 0) return [];
      const { getGamesByWeek } = await import('@/lib/api');
      const allGamesData: Array<{ 
        id: string; 
        week_id: string; 
        home_team_id: string; 
        away_team_id: string;
      }> = [];
      for (const week of weeks) {
        const games = await getGamesByWeek(week.id);
        allGamesData.push(...games.map(g => ({ 
          id: g.id, 
          week_id: week.id,
          home_team_id: g.home_team_id,
          away_team_id: g.away_team_id,
        })));
      }
      return allGamesData;
    },
    enabled: !!activeSeason?.id && weeks.length > 0,
  });

  // Create map: playerId -> weekId -> gameId (the game the player is playing in that week)
  const playerWeekGameMap = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    
    activePlayers.forEach(player => {
      const playerWeekMap = new Map<string, string>();
      
      // Find games where this player's team is playing
      allGames.forEach(game => {
        if (game.home_team_id === player.teamId || game.away_team_id === player.teamId) {
          playerWeekMap.set(game.week_id, game.id);
        }
      });
      
      map.set(player.id, playerWeekMap);
    });
    
    return map;
  }, [activePlayers, allGames]);

  // Get all availability data
  const { data: availabilityData = [], isLoading: isLoadingAvailability, refetch: refetchAvailability } = useQuery({
    queryKey: ['availability', activeSeason?.id],
    queryFn: () => getAvailabilityForSeason(activeSeason?.id || ''),
    enabled: !!activeSeason?.id,
  });

  // Create availability map: gameId -> playerId -> status
  const availabilityMap = useMemo(() => {
    const map = new Map<string, Map<string, AvailabilityStatus>>();
    availabilityData.forEach(av => {
      if (!map.has(av.gameId)) {
        map.set(av.gameId, new Map());
      }
      map.get(av.gameId)!.set(av.playerId, av.status);
    });
    return map;
  }, [availabilityData]);

  // Sort state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Sorted players
  const sortedPlayers = useMemo(() => {
    const sorted = [...activePlayers].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'team':
          const teamA = teams.find(t => t.id === a.teamId)?.name || '';
          const teamB = teams.find(t => t.id === b.teamId)?.name || '';
          comparison = teamA.localeCompare(teamB);
          break;
        case 'value':
          comparison = a.startingValue - b.startingValue;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [activePlayers, sortField, sortDirection, teams]);

  // Sort handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Update availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: ({ playerId, gameId, status }: { playerId: string; gameId: string; status: AvailabilityStatus }) =>
      updatePlayerAvailability(playerId, gameId, status),
    onMutate: async ({ playerId, gameId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['availability', activeSeason?.id] });

      // Snapshot the previous value
      const previousAvailability = queryClient.getQueryData<Array<{
        playerId: string;
        gameId: string;
        status: AvailabilityStatus;
      }>>(['availability', activeSeason?.id]);

      // Optimistically update the cache
      if (previousAvailability) {
        const updated = previousAvailability.map(av =>
          av.playerId === playerId && av.gameId === gameId
            ? { ...av, status }
            : av
        );
        // If not found, add it
        const exists = updated.some(av => av.playerId === playerId && av.gameId === gameId);
        if (!exists) {
          updated.push({ playerId, gameId, status });
        }
        queryClient.setQueryData(['availability', activeSeason?.id], updated);
      }

      return { previousAvailability };
    },
    onSuccess: async (result, variables, context) => {
      if (result.success) {
        // Refetch to ensure we have the latest data from the server
        await refetchAvailability();
        toast.success('Availability updated');
      } else {
        // Rollback on failure
        if (context?.previousAvailability) {
          queryClient.setQueryData(['availability', activeSeason?.id], context.previousAvailability);
        }
        toast.error(result.error || 'Failed to update availability');
      }
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousAvailability) {
        queryClient.setQueryData(['availability', activeSeason?.id], context.previousAvailability);
      }
      toast.error(`Failed to update availability: ${error.message}`);
    },
  });

  // Update starting value mutation
  const updateValueMutation = useMutation({
    mutationFn: ({ seasonId, playerId, value }: { seasonId: string; playerId: string; value: number }) =>
      updateSeasonPlayerValue(seasonId, playerId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: seasonKeys.players(activeSeason?.id || '') });
      toast.success('Starting value updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update value: ${error.message}`);
    },
  });

  // Get availability status for a player in a week (their game in that week)
  const getAvailabilityStatus = (playerId: string, weekId: string): AvailabilityStatus => {
    const playerWeekMap = playerWeekGameMap.get(playerId);
    if (!playerWeekMap) return 'available';
    
    const gameId = playerWeekMap.get(weekId);
    if (!gameId) return 'available';
    
    return availabilityMap.get(gameId)?.get(playerId) || 'available';
  };

  // Handle availability change
  const handleAvailabilityChange = (playerId: string, weekId: string, status: AvailabilityStatus) => {
    const playerWeekMap = playerWeekGameMap.get(playerId);
    if (!playerWeekMap) {
      console.error(`No player week map found for player ${playerId}`);
      toast.error('Could not find player game mapping');
      return;
    }
    
    const gameId = playerWeekMap.get(weekId);
    if (!gameId) {
      console.error(`No game found for player ${playerId} in week ${weekId}`);
      toast.error(`No game found for this player in Week ${weeks.find(w => w.id === weekId)?.week_number || 'unknown'}. Please create a game for this week first.`);
      return;
    }
    
    updateAvailabilityMutation.mutate({ playerId, gameId, status });
  };

  // Handle value change
  const handleValueChange = (playerId: string, value: number) => {
    if (!activeSeason?.id) return;
    updateValueMutation.mutate({ seasonId: activeSeason.id, playerId, value });
  };

  if (!activeSeason) {
    return <div>No active season selected</div>;
  }

  if (isLoadingAvailability) {
    return <div>Loading availability data...</div>;
  }

  // Sort weeks by week number
  const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number);

  return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>Player Availability & Values</h3>
      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', position: 'sticky', top: 0, zIndex: 10 }}>
              <th
                style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: '600',
                }}
                onClick={() => handleSort('name')}
              >
                Player Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: '600',
                }}
                onClick={() => handleSort('team')}
              >
                Team {sortField === 'team' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: '600',
                }}
                onClick={() => handleSort('value')}
              >
                Starting Value {sortField === 'value' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {sortedWeeks.map(week => (
                <th
                  key={week.id}
                  style={{
                    padding: '0.75rem',
                    textAlign: 'center',
                    minWidth: '120px',
                    fontWeight: '600',
                  }}
                >
                  Week {week.week_number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map(player => {
              const team = teams.find(t => t.id === player.teamId);
              return (
                <tr key={player.id} style={{ backgroundColor: '#fff' }}>
                  <td style={{ padding: '0.75rem' }}>{player.name}</td>
                  <td style={{ padding: '0.75rem' }}>{team?.name || 'No team'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <input
                      type="number"
                      value={player.startingValue}
                      onChange={(e) => handleValueChange(player.id, parseFloat(e.target.value) || 0)}
                      style={{
                        width: '80px',
                        padding: '0.25rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                      }}
                      step="0.01"
                      min="0"
                    />
                  </td>
                  {sortedWeeks.map(week => (
                    <td
                      key={`${player.id}-${week.id}`}
                      style={{ padding: '0.75rem', textAlign: 'center' }}
                    >
                      <select
                        value={getAvailabilityStatus(player.id, week.id)}
                        onChange={(e) => handleAvailabilityChange(player.id, week.id, e.target.value as AvailabilityStatus)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          width: '100%',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="available">Yes</option>
                        <option value="unavailable">No</option>
                        <option value="unsure">Maybe</option>
                      </select>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

