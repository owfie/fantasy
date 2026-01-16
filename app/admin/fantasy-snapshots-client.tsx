'use client';

import { useState, useMemo } from 'react';
import { useFantasyTeams } from '@/lib/queries/fantasy-teams-test.queries';
import { useAllSnapshotsWithDetailsForTeam } from '@/lib/queries/fantasy-snapshots.queries';
import { Card } from '@/components/Card';
import { formatCurrency } from '@/lib/utils/fantasy-utils';
import { computeTransfersFromSnapshots } from '@/lib/utils/transfer-computation';

interface FantasySnapshotsClientProps {
  seasonId: string | undefined;
}

export default function FantasySnapshotsClient({ seasonId }: FantasySnapshotsClientProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([null, null]);

  const { data: fantasyTeams = [], isLoading: isLoadingTeams } = useFantasyTeams(seasonId || null);
  const { data: snapshots = [], isLoading: isLoadingSnapshots } = useAllSnapshotsWithDetailsForTeam(selectedTeamId);

  // Get computed transfers between two snapshots
  // IMPORTANT: This useMemo must be before any conditional returns to satisfy React's Rules of Hooks
  const comparedTransfers = useMemo(() => {
    if (!compareIds[0] || !compareIds[1]) return null;
    
    const snapshot1 = snapshots.find(s => s.snapshot.id === compareIds[0]);
    const snapshot2 = snapshots.find(s => s.snapshot.id === compareIds[1]);
    
    if (!snapshot1 || !snapshot2) return null;
    
    // Determine which is "before" and which is "after" by week number
    const [before, after] = (snapshot1.week?.week_number || 0) < (snapshot2.week?.week_number || 0) 
      ? [snapshot1, snapshot2] 
      : [snapshot2, snapshot1];
    
    const beforePlayers = before.players.map(p => ({
      playerId: p.player_id,
      position: p.position,
    }));
    const afterPlayers = after.players.map(p => ({
      playerId: p.player_id,
      position: p.position,
    }));

    return {
      before,
      after,
      transfers: computeTransfersFromSnapshots(afterPlayers, beforePlayers),
    };
  }, [compareIds, snapshots]);

  // Early returns for loading/empty states (after all hooks)
  if (!seasonId) {
    return (
      <Card>
        <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
          Please select a season to view team snapshots
        </p>
      </Card>
    );
  }

  if (isLoadingTeams) {
    return (
      <Card>
        <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>Loading teams...</p>
      </Card>
    );
  }

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId);
    setExpandedSnapshotId(null);
    setCompareMode(false);
    setCompareIds([null, null]);
  };

  const toggleSnapshotExpand = (snapshotId: string) => {
    setExpandedSnapshotId(prev => prev === snapshotId ? null : snapshotId);
  };

  const handleCompareSelect = (snapshotId: string) => {
    if (compareIds[0] === null) {
      setCompareIds([snapshotId, null]);
    } else if (compareIds[1] === null && compareIds[0] !== snapshotId) {
      setCompareIds([compareIds[0], snapshotId]);
    } else if (compareIds[0] === snapshotId) {
      setCompareIds([compareIds[1], null]);
    } else if (compareIds[1] === snapshotId) {
      setCompareIds([compareIds[0], null]);
    }
  };

  return (
    <Card>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Team Snapshots</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          View historical snapshots of fantasy teams by week. Each snapshot represents the team state at a point in time.
          Team values shown are <strong>historical</strong> (the value at the time of the snapshot).
        </p>
      </div>

      {/* Team Selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
          Select Fantasy Team
        </label>
        <select
          value={selectedTeamId}
          onChange={(e) => handleTeamSelect(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '1rem',
          }}
        >
          <option value="">-- Select a team --</option>
          {fantasyTeams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {selectedTeamId && isLoadingSnapshots && (
        <p style={{ color: '#666', textAlign: 'center', padding: '1rem' }}>Loading snapshots...</p>
      )}

      {/* No snapshots state */}
      {selectedTeamId && !isLoadingSnapshots && snapshots.length === 0 && (
        <p style={{ color: '#666', textAlign: 'center', padding: '1rem' }}>
          No snapshots found for this team. Snapshots are created when teams save their roster.
        </p>
      )}

      {/* Snapshots List */}
      {selectedTeamId && !isLoadingSnapshots && snapshots.length > 0 && (
        <div>
          {/* Compare Mode Toggle */}
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareIds([null, null]);
              }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: compareMode ? '#3b82f6' : '#e5e7eb',
                color: compareMode ? 'white' : '#374151',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {compareMode ? 'Exit Compare Mode' : 'Compare Snapshots'}
            </button>
            {compareMode && (
              <span style={{ color: '#666', fontSize: '0.9rem' }}>
                {compareIds[0] && compareIds[1] 
                  ? 'Viewing comparison below'
                  : compareIds[0] 
                    ? 'Select second snapshot to compare'
                    : 'Select two snapshots to compare'}
              </span>
            )}
          </div>

          {/* Comparison Result */}
          {compareMode && comparedTransfers && (
            <div style={{ 
              marginBottom: '1.5rem', 
              padding: '1rem', 
              backgroundColor: '#f0f9ff', 
              borderRadius: '8px',
              border: '1px solid #bae6fd',
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0' }}>
                Transfers: Week {comparedTransfers.before.week?.week_number} → Week {comparedTransfers.after.week?.week_number}
              </h4>
              {comparedTransfers.transfers.length === 0 ? (
                <p style={{ margin: 0, color: '#666' }}>No transfers between these weeks</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {comparedTransfers.transfers.map((transfer, idx) => {
                    const playerIn = comparedTransfers.after.players.find(p => p.player_id === transfer.playerInId);
                    const playerOut = comparedTransfers.before.players.find(p => p.player_id === transfer.playerOutId);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#dc2626' }}>
                          OUT: {playerOut?.player?.first_name} {playerOut?.player?.last_name || transfer.playerOutId}
                        </span>
                        <span>→</span>
                        <span style={{ color: '#16a34a' }}>
                          IN: {playerIn?.player?.first_name} {playerIn?.player?.last_name || transfer.playerInId}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Snapshots Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {compareMode && <th style={{ padding: '0.75rem', textAlign: 'center', width: '60px' }}>Select</th>}
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Week</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Created</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Team Value</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Players</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((item) => {
                const isSelected = compareIds.includes(item.snapshot.id);
                const isExpanded = expandedSnapshotId === item.snapshot.id;
                
                return (
                  <>
                    <tr 
                      key={item.snapshot.id}
                      style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: isSelected ? '#dbeafe' : 'transparent',
                      }}
                    >
                      {compareMode && (
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleCompareSelect(item.snapshot.id)}
                            disabled={!isSelected && compareIds[0] !== null && compareIds[1] !== null}
                          />
                        </td>
                      )}
                      <td style={{ padding: '0.75rem' }}>
                        <strong>Week {item.week?.week_number || '?'}</strong>
                        {item.week?.name && <span style={{ color: '#666', marginLeft: '0.5rem' }}>({item.week.name})</span>}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#666' }}>
                        {new Date(item.snapshot.snapshot_created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {formatCurrency(item.snapshot.total_value)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {item.players.length}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleSnapshotExpand(item.snapshot.id)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            backgroundColor: isExpanded ? '#3b82f6' : 'white',
                            color: isExpanded ? 'white' : '#374151',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          {isExpanded ? 'Hide' : 'Show Players'}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Players Row */}
                    {isExpanded && (
                      <tr key={`${item.snapshot.id}-players`}>
                        <td colSpan={compareMode ? 6 : 5} style={{ padding: '1rem', backgroundColor: '#f9fafb' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                            {item.players
                              .sort((a, b) => {
                                // Sort by: field players first, then by position
                                if (a.is_benched !== b.is_benched) return a.is_benched ? 1 : -1;
                                return a.position.localeCompare(b.position);
                              })
                              .map((player) => (
                                <div
                                  key={player.player_id}
                                  style={{
                                    padding: '0.5rem',
                                    backgroundColor: player.is_benched ? '#fef3c7' : 'white',
                                    borderRadius: '4px',
                                    border: `1px solid ${player.is_captain ? '#fbbf24' : '#e5e7eb'}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}
                                >
                                  <div>
                                    <span style={{ fontWeight: player.is_captain ? 600 : 400 }}>
                                      {player.is_captain && '👑 '}
                                      {player.player?.first_name} {player.player?.last_name}
                                    </span>
                                    <span style={{ 
                                      marginLeft: '0.5rem', 
                                      fontSize: '0.75rem', 
                                      color: '#666',
                                      textTransform: 'uppercase',
                                    }}>
                                      {player.position}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '0.875rem', color: '#666' }}>
                                    {formatCurrency(player.player_value_at_snapshot)}
                                  </span>
                                </div>
                              ))}
                          </div>
                          {item.players.some(p => p.is_benched) && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#666' }}>
                              🟡 Yellow background = Bench player
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

