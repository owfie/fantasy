'use client';

import { useState } from 'react';
import { useAdminDashboard } from '@/lib/queries/test.queries';
import { saveWeekStats, AdminDashboardData } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Helper to format player role for display
function formatPlayerRole(role: string): string {
  const roleMap: Record<string, string> = {
    captain: 'Captain',
    player: 'Player',
    marquee: 'Marquee',
    rookie_marquee: 'Rookie Marquee',
    reserve: 'Reserve',
  };
  return roleMap[role] || role;
}

interface AdminDashboardProps {
  seasonId?: string;
}

export default function AdminDashboard({ seasonId }: AdminDashboardProps) {
  const { data, isLoading, error, refetch } = useAdminDashboard(seasonId);
  const queryClient = useQueryClient();
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [editingStats, setEditingStats] = useState<Record<string, {
    goals: number;
    assists: number;
    blocks: number;
    drops: number;
    throwaways: number;
    played: boolean;
  }>>({});
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>Admin Dashboard</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>Admin Dashboard</h2>
        <p style={{ color: 'red' }}>Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  if (!data || data.weekStats.length === 0) {
    return (
      <div style={{ padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>Admin Dashboard</h2>
        <p>No weeks found. Please create a season and weeks first.</p>
      </div>
    );
  }

  const selectedWeek = data.weekStats[selectedWeekIndex];
  if (!selectedWeek) {
    return null;
  }

  const handleStatChange = (playerId: string, field: string, value: number | boolean) => {
    setEditingStats((prev) => {
      const player = selectedWeek.playerStats.find(p => p.playerId === playerId);
      const current = prev[playerId] || {
        goals: player?.goals || 0,
        assists: player?.assists || 0,
        blocks: player?.blocks || 0,
        drops: player?.drops || 0,
        throwaways: player?.throwaways || 0,
        played: player?.played !== undefined ? player.played : true,
      };
      
      // If played is being set to false, reset all stats to zero
      if (field === 'played' && value === false) {
        return {
          ...prev,
          [playerId]: {
            goals: 0,
            assists: 0,
            blocks: 0,
            drops: 0,
            throwaways: 0,
            played: false,
          },
        };
      }
      
      return {
        ...prev,
        [playerId]: {
          ...current,
          [field]: typeof value === 'boolean' ? value : Math.max(0, value),
        },
      };
    });
  };

  const calculatePoints = (playerId: string): number => {
    const stats = editingStats[playerId] || selectedWeek.playerStats.find(p => p.playerId === playerId);
    if (!stats) return 0;
    return stats.goals + (stats.assists * 2) + (stats.blocks * 3) - stats.drops - stats.throwaways;
  };

  const handleSaveWeek = async () => {
    if (!data.weeks[selectedWeekIndex]) return;
    
    setSaving(true);
    try {
      const week = data.weeks[selectedWeekIndex];
      
      // Only include stats that have actually changed
      // Compare edited stats against original stats from the database
      let totalFieldChanges = 0;
      const playerStatsToSave = selectedWeek.playerStats
        .map((player) => {
          const edited = editingStats[player.playerId];
          
          // If no edits, use current values but still check if we need to save
          const finalStats = edited || {
            goals: player.goals,
            assists: player.assists,
            blocks: player.blocks,
            drops: player.drops,
            throwaways: player.throwaways,
            played: player.played !== undefined ? player.played : true,
          };
          
          // Count how many fields changed
          const fieldChanges = [
            finalStats.goals !== player.goals,
            finalStats.assists !== player.assists,
            finalStats.blocks !== player.blocks,
            finalStats.drops !== player.drops,
            finalStats.throwaways !== player.throwaways,
            finalStats.played !== (player.played !== undefined ? player.played : true),
          ].filter(Boolean).length;
          
          // Check if anything actually changed from the original database values
          const hasChanges = fieldChanges > 0;
          
          // Only include if there are changes
          if (!hasChanges) {
            return null;
          }
          
          totalFieldChanges += fieldChanges;
          
          return {
            playerId: player.playerId,
            goals: finalStats.goals,
            assists: finalStats.assists,
            blocks: finalStats.blocks,
            drops: finalStats.drops,
            throwaways: finalStats.throwaways,
            played: finalStats.played,
          };
        })
        .filter((stat): stat is NonNullable<typeof stat> => stat !== null);
      
      if (playerStatsToSave.length === 0) {
        toast.info('No changes to save');
        setSaving(false);
        return;
      }
      
      const result = await saveWeekStats({
        weekId: selectedWeek.weekId || week.id,
        playerStats: playerStatsToSave,
        adminUserId: '2eb0941a-b6bf-418a-a711-4db9426f5161', // Default admin user
      });
      
      if (result.success) {
        // Get the weekId we're saving to
        const weekIdToSave = selectedWeek.weekId || week.id;
        
        // Optimistically update the query cache with the saved values
        // This keeps the UI showing the correct values immediately
        queryClient.setQueryData<AdminDashboardData>(['test', 'adminDashboard'], (oldData) => {
          if (!oldData) return oldData;
          
          // Update the weekStats with the saved values
          const updatedWeekStats = oldData.weekStats.map((weekStat) => {
            if (weekStat.weekId !== weekIdToSave) return weekStat;
            
            // Update player stats with the saved values
            const updatedPlayerStats = weekStat.playerStats.map((player) => {
              const savedStat = playerStatsToSave.find(s => s.playerId === player.playerId);
              if (!savedStat) return player;
              
              // Calculate new points
              const newPoints = savedStat.goals + (savedStat.assists * 2) + (savedStat.blocks * 3) - savedStat.drops - savedStat.throwaways;
              const isCompleted = newPoints !== 0 || 
                savedStat.goals > 0 || 
                savedStat.assists > 0 || 
                savedStat.blocks > 0 || 
                savedStat.drops > 0 || 
                savedStat.throwaways > 0;
              
              return {
                ...player,
                goals: savedStat.goals,
                assists: savedStat.assists,
                blocks: savedStat.blocks,
                drops: savedStat.drops,
                throwaways: savedStat.throwaways,
                points: newPoints,
                isCompleted,
                played: savedStat.played !== undefined ? savedStat.played : true,
              };
            });
            
            const completedCount = updatedPlayerStats.filter(p => p.isCompleted).length;
            
            return {
              ...weekStat,
              playerStats: updatedPlayerStats,
              completedCount,
            };
          });
          
          const weeksCompleted = updatedWeekStats.filter(w => w.completedCount === w.totalPlayers && w.totalPlayers > 0).length;
          
          return {
            ...oldData,
            weekStats: updatedWeekStats,
            weeksCompleted,
          };
        });
        
        // Refresh data in the background to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['test', 'adminDashboard'] });
        
        // Refetch and clear editing state only after refetch completes
        // This ensures the optimistic update is visible, and if refetch fails, we keep the edited values
        refetch().then(() => {
          // Clear editing state after refetch completes successfully
          // The optimistic update ensures the inputs show the correct values
          setEditingStats({});
        }).catch(() => {
          // On error, keep editing state so user doesn't lose their work
          // The optimistic update will be overwritten by the refetch error
        });
        
        const playerCount = playerStatsToSave.length;
        const weekNumber = selectedWeek.weekNumber;
        const createdCount = result.data?.createdCount || 0;
        const updatedCount = result.data?.updatedCount || 0;
        
        let description = `Changed ${totalFieldChanges} field${totalFieldChanges !== 1 ? 's' : ''} for ${playerCount} player${playerCount !== 1 ? 's' : ''} in Week ${weekNumber}`;
        if (createdCount > 0 || updatedCount > 0) {
          const actions = [];
          if (createdCount > 0) actions.push(`${createdCount} created`);
          if (updatedCount > 0) actions.push(`${updatedCount} updated`);
          description += ` (${actions.join(', ')})`;
        }
        
        toast.success('Stats saved successfully', {
          description,
        });
      } else {
        // On error, keep the editing state so user doesn't lose their work
        toast.error('Failed to save stats', {
          description: result.message || 'An error occurred',
        });
      }
    } catch (error: unknown) {
      toast.error('Error saving stats', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const seasonProgress = data.totalWeeks > 0 ? Math.round((data.weeksCompleted / data.totalWeeks) * 100) : 0;

  return (
    <div style={{ padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Admin Dashboard</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Enter weekly stats for all players</p>
        </div>
        <button
          style={{
            padding: '0.5rem 1rem',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
          }}
        >
          + Add Player
        </button>
      </div>

      {/* Weekly Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {data.weekStats.map((week, index) => {
          const isSelected = index === selectedWeekIndex;
          const isCompleted = week.completedCount === week.totalPlayers && week.totalPlayers > 0;
          const completionRatio = week.totalPlayers > 0 ? `${week.completedCount}/${week.totalPlayers}` : '0/0';
          
          return (
            <button
              key={week.weekId}
              onClick={() => setSelectedWeekIndex(index)}
              style={{
                padding: '0.75rem 1rem',
                background: isSelected ? (isCompleted ? '#e7f3ff' : '#fff3cd') : 'white',
                color: isSelected ? '#007bff' : '#333',
                border: isSelected ? '2px solid #007bff' : '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: isSelected ? '600' : '400',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '120px',
                justifyContent: 'center',
              }}
            >
              {isCompleted && (
                <span style={{ color: '#28a745', fontSize: '1rem' }}>✓</span>
              )}
              {!isCompleted && week.completedCount === 0 && (
                <span style={{ color: '#999', fontSize: '0.8rem' }}>○</span>
              )}
              <span>
                Week {week.weekNumber} {completionRatio}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stats Table */}
      <div style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', minWidth: '200px' }}>Player</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', minWidth: '100px' }}>Goals (+3)</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', minWidth: '100px' }}>Assists (+2)</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', minWidth: '100px' }}>Blocks (+3)</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', minWidth: '100px' }}>Drops (-1)</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', minWidth: '100px' }}>Turnovers (-1)</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', minWidth: '100px' }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {selectedWeek.playerStats.map((player, index) => {
              const editedStats = editingStats[player.playerId];
              const displayStats = editedStats || {
                goals: player.goals,
                assists: player.assists,
                blocks: player.blocks,
                drops: player.drops,
                throwaways: player.throwaways,
                played: player.played !== undefined ? player.played : true,
              };
              const points = calculatePoints(player.playerId);
              
              return (
                <tr
                  key={player.playerId}
                  style={{
                    background: index % 2 === 0 ? 'white' : '#f8f9fa',
                    borderBottom: '1px solid #dee2e6',
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {player.isCompleted && (
                        <span style={{ color: '#28a745', fontSize: '0.9rem' }}>✓</span>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500' }}>{player.playerName}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                          {formatPlayerRole(player.playerRole)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={displayStats.played}
                          onChange={(e) => handleStatChange(player.playerId, 'played', e.target.checked)}
                          style={{
                            cursor: 'pointer',
                            width: '18px',
                            height: '18px',
                          }}
                          title="Player played"
                        />
                        <span style={{ fontSize: '0.75rem', color: '#666', whiteSpace: 'nowrap' }}>Played</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      value={displayStats.goals}
                      onChange={(e) => handleStatChange(player.playerId, 'goals', parseInt(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      disabled={!displayStats.played}
                      style={{
                        width: '60px',
                        padding: '0.25rem',
                        textAlign: 'center',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: !displayStats.played ? '#f5f5f5' : 'white',
                        cursor: !displayStats.played ? 'not-allowed' : 'text',
                        opacity: !displayStats.played ? 0.6 : 1,
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      value={displayStats.assists}
                      onChange={(e) => handleStatChange(player.playerId, 'assists', parseInt(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      disabled={!displayStats.played}
                      style={{
                        width: '60px',
                        padding: '0.25rem',
                        textAlign: 'center',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: !displayStats.played ? '#f5f5f5' : 'white',
                        cursor: !displayStats.played ? 'not-allowed' : 'text',
                        opacity: !displayStats.played ? 0.6 : 1,
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      value={displayStats.blocks}
                      onChange={(e) => handleStatChange(player.playerId, 'blocks', parseInt(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      disabled={!displayStats.played}
                      style={{
                        width: '60px',
                        padding: '0.25rem',
                        textAlign: 'center',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: !displayStats.played ? '#f5f5f5' : 'white',
                        cursor: !displayStats.played ? 'not-allowed' : 'text',
                        opacity: !displayStats.played ? 0.6 : 1,
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      value={displayStats.drops}
                      onChange={(e) => handleStatChange(player.playerId, 'drops', parseInt(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      disabled={!displayStats.played}
                      style={{
                        width: '60px',
                        padding: '0.25rem',
                        textAlign: 'center',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: !displayStats.played ? '#f5f5f5' : 'white',
                        cursor: !displayStats.played ? 'not-allowed' : 'text',
                        opacity: !displayStats.played ? 0.6 : 1,
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      value={displayStats.throwaways}
                      onChange={(e) => handleStatChange(player.playerId, 'throwaways', parseInt(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      disabled={!displayStats.played}
                      style={{
                        width: '60px',
                        padding: '0.25rem',
                        textAlign: 'center',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: !displayStats.played ? '#f5f5f5' : 'white',
                        cursor: !displayStats.played ? 'not-allowed' : 'text',
                        opacity: !displayStats.played ? 0.6 : 1,
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '600', color: points > 0 ? '#28a745' : points < 0 ? '#dc3545' : '#666' }}>
                    {points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #dee2e6' }}>
        <div style={{ color: '#666', fontSize: '0.9rem' }}>
          {selectedWeek.completedCount} of {selectedWeek.totalPlayers} players completed
        </div>
        <button
          onClick={handleSaveWeek}
          disabled={saving}
          style={{
            padding: '0.75rem 1.5rem',
            background: saving ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
          }}
        >
          {saving ? 'Saving...' : `Save Week ${selectedWeek.weekNumber}`}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Total Players</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>{data.totalPlayers}</div>
        </div>
        <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Weeks Completed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
            {data.weeksCompleted}/{data.totalWeeks}
          </div>
        </div>
        <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Season Progress</div>
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ background: '#e9ecef', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  background: '#007bff',
                  height: '100%',
                  width: `${seasonProgress}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#333', marginTop: '0.25rem' }}>
              {seasonProgress}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

