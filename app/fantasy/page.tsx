'use client';

import { useState } from 'react';
import { useActiveSeason } from '@/lib/queries/fantasy-teams-test.queries';
import { useFantasyTeams } from '@/lib/queries/fantasy-teams-test.queries';
import { useSnapshotForWeek, useSnapshotsForTeam } from '@/lib/queries/fantasy-snapshots.queries';
import { useRemainingTransfers, useCanMakeTransfer } from '@/lib/queries/transfers.queries';
import { useWeeks } from '@/lib/queries/seasons.queries';

export default function FantasyPage() {
  const { data: activeSeason } = useActiveSeason();
  const { data: fantasyTeams = [] } = useFantasyTeams(activeSeason?.id || null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    fantasyTeams.length > 0 ? fantasyTeams[0].id : null
  );
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  const { data: weeks = [] } = useWeeks(activeSeason?.id || '');
  const { data: snapshots = [] } = useSnapshotsForTeam(selectedTeamId || '');
  const { data: snapshot } = useSnapshotForWeek(selectedTeamId || '', selectedWeekId || '');
  const { data: canTransfer } = useCanMakeTransfer(selectedTeamId || '', selectedWeekId || '');
  const { data: remainingTransfers } = useRemainingTransfers(selectedTeamId || '', selectedWeekId || '');

  const selectedTeam = fantasyTeams.find(t => t.id === selectedTeamId);
  const selectedWeek = weeks.find(w => w.id === selectedWeekId);

  if (!activeSeason) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Fantasy Teams</h1>
        <p>No active season found. Please create a season first.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Fantasy Team</h1>

      {fantasyTeams.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p>You don't have a fantasy team yet. Please create one in the admin panel.</p>
        </div>
      ) : (
        <>
          {/* Team Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Team:</label>
            <select
              value={selectedTeamId || ''}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="border rounded p-2"
            >
              {fantasyTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>

          {selectedTeam && (
            <>
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <h2 className="text-xl font-semibold mb-2">{selectedTeam.name}</h2>
                <p>Total Value: ${selectedTeam.total_value.toFixed(2)}</p>
                <p>Original Value: ${selectedTeam.original_value.toFixed(2)}</p>
              </div>

              {/* Week Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">View Week:</label>
                <select
                  value={selectedWeekId || ''}
                  onChange={(e) => setSelectedWeekId(e.target.value)}
                  className="border rounded p-2"
                >
                  <option value="">Select a week...</option>
                  {weeks.map(week => (
                    <option key={week.id} value={week.id}>
                      {week.name || `Week ${week.week_number}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transfer Info */}
              {selectedWeekId && (
                <div className="mb-4 p-4 bg-blue-50 rounded">
                  <h3 className="font-semibold mb-2">Transfer Window</h3>
                  <p>Window Open: {selectedWeek?.transfer_window_open ? 'Yes' : 'No'}</p>
                  {selectedWeek?.transfer_cutoff_time && (
                    <p>Cutoff: {new Date(selectedWeek.transfer_cutoff_time).toLocaleString()}</p>
                  )}
                  {canTransfer?.canTransfer ? (
                    <p className="text-green-600">✓ Transfers allowed</p>
                  ) : (
                    <p className="text-red-600">✗ {canTransfer?.reason || 'Transfers not allowed'}</p>
                  )}
                  {remainingTransfers !== undefined && (
                    <p>Remaining Transfers: {remainingTransfers} / 2</p>
                  )}
                </div>
              )}

              {/* Snapshot Info */}
              {snapshot && (
                <div className="mb-4 p-4 bg-green-50 rounded">
                  <h3 className="font-semibold mb-2">Week Snapshot</h3>
                  <p>Total Value: ${snapshot.total_value.toFixed(2)}</p>
                  <p>Captain: {snapshot.captain_player_id}</p>
                  <p>Created: {new Date(snapshot.snapshot_created_at).toLocaleString()}</p>
                </div>
              )}

              {/* Snapshots List */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">All Snapshots</h3>
                {snapshots.length === 0 ? (
                  <p className="text-gray-500">No snapshots yet for this team.</p>
                ) : (
                  <div className="space-y-2">
                    {snapshots.map(snap => {
                      const week = weeks.find(w => w.id === snap.week_id);
                      return (
                        <div key={snap.id} className="p-3 border rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">
                              {week?.name || `Week ${week?.week_number || '?'}`}
                            </span>
                            <span>${snap.total_value.toFixed(2)}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(snap.snapshot_created_at).toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
