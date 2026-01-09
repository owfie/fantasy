'use client';

import { useState } from 'react';
import {
  useSeasons,
  useActiveSeason,
  useSeasonPlayers,
  useCreateSeason,
  useUpdateSeason,
  useDeleteSeason,
  useSetSeasonActive,
  useAddPlayersToSeason,
  useRemovePlayerFromSeason,
  useUpdateSeasonPlayerValue,
  useSetSeasonPlayerActive,
  useUpdateSeasonPlayerTeam,
} from '@/lib/queries/seasons.queries';
import { useQuery } from '@tanstack/react-query';
import { getPlayers, testGetAllTeams } from '@/lib/api';
import {
  TestResultDisplay,
  FormField,
  FormInput,
  FormNumberInput,
  FormSection,
  Button,
  formatDate,
} from './shared/crud-components';
import { Season, Player, Team } from '@/lib/domain/types';
import { SeasonPlayerWithPlayer } from '@/lib/domain/repositories';

interface TestResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export default function SeasonsCrudClient() {
  const { data: seasons = [], isLoading: isLoadingSeasons, error: seasonsError } = useSeasons();
  const { data: activeSeason } = useActiveSeason();
  
  // Mutations
  const createSeasonMutation = useCreateSeason();
  const updateSeasonMutation = useUpdateSeason();
  const deleteSeasonMutation = useDeleteSeason();
  const setActiveMutation = useSetSeasonActive();

  // Local state
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [formData, setFormData] = useState({
    createName: '',
    createStartDate: '',
    createEndDate: '',
    createIsActive: false,
    updateId: '',
    updateName: '',
    updateStartDate: '',
    updateEndDate: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createSeasonMutation.mutateAsync({
        name: formData.createName,
        start_date: formData.createStartDate,
        end_date: formData.createEndDate,
        is_active: formData.createIsActive,
      });
      setResults((prev) => ({ ...prev, create: result }));
      if (result.success) {
        setFormData((prev) => ({
          ...prev,
          createName: '',
          createStartDate: '',
          createEndDate: '',
          createIsActive: false,
        }));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create season';
      setResults((prev) => ({
        ...prev,
        create: { success: false, message, error: message },
      }));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await updateSeasonMutation.mutateAsync({
        id: formData.updateId,
        name: formData.updateName || undefined,
        start_date: formData.updateStartDate || undefined,
        end_date: formData.updateEndDate || undefined,
      });
      setResults((prev) => ({ ...prev, update: result }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update season';
      setResults((prev) => ({
        ...prev,
        update: { success: false, message, error: message },
      }));
    }
  };

  const handleDelete = async (seasonId: string) => {
    if (!confirm('Are you sure you want to permanently delete this season?')) return;
    try {
      const result = await deleteSeasonMutation.mutateAsync(seasonId);
      setResults((prev) => ({ ...prev, delete: result }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete season';
      setResults((prev) => ({
        ...prev,
        delete: { success: false, message, error: message },
      }));
    }
  };

  const handleSetActive = async (seasonId: string) => {
    try {
      const result = await setActiveMutation.mutateAsync(seasonId);
      setResults((prev) => ({ ...prev, setActive: result }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to set active';
      setResults((prev) => ({
        ...prev,
        setActive: { success: false, message, error: message },
      }));
    }
  };

  if (isLoadingSeasons) {
    return (
      <div>
        <h3>📅 Seasons Management</h3>
        <p>Loading seasons...</p>
      </div>
    );
  }

  if (seasonsError) {
    return (
      <div>
        <h3>📅 Seasons Management</h3>
        <p style={{ color: 'red' }}>
          Error loading seasons: {seasonsError instanceof Error ? seasonsError.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);

  return (
    <div>
      <h3>Seasons</h3>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Manage seasons and assign players with season-specific values
      </p>

      {activeSeason && (
        <div style={{ padding: '0.75rem', background: '#d4edda', borderRadius: '4px', marginBottom: '1.5rem' }}>
          <strong>Active Season:</strong> {activeSeason.name} ({activeSeason.start_date} - {activeSeason.end_date})
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column: Forms */}
        <div>
          {/* Create Season */}
          <FormSection title="Create Season">
            <form onSubmit={handleCreate}>
              <FormField label="Name" required>
                <FormInput
                  value={formData.createName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, createName: e.target.value }))}
                  placeholder="Season 2025"
                  required
                />
              </FormField>
              <FormField label="Start Date" required>
                <FormInput
                  type="date"
                  value={formData.createStartDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, createStartDate: e.target.value }))}
                  required
                />
              </FormField>
              <FormField label="End Date" required>
                <FormInput
                  type="date"
                  value={formData.createEndDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, createEndDate: e.target.value }))}
                  required
                />
              </FormField>
              <FormField label="">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.createIsActive}
                    onChange={(e) => setFormData((prev) => ({ ...prev, createIsActive: e.target.checked }))}
                  />
                  Set as active season
                </label>
              </FormField>
              <Button type="submit" variant="success" isLoading={createSeasonMutation.isPending}>
                Create Season
              </Button>
              <TestResultDisplay testName="create" isLoading={createSeasonMutation.isPending} result={results.create} />
            </form>
          </FormSection>

          {/* Update Season */}
          <FormSection title="Update Season">
            <form onSubmit={handleUpdate} data-update-form>
              <FormField label="Season ID" required>
                <FormInput
                  value={formData.updateId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, updateId: e.target.value }))}
                  placeholder="Enter season UUID"
                  required
                />
              </FormField>
              <FormField label="New Name">
                <FormInput
                  value={formData.updateName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, updateName: e.target.value }))}
                />
              </FormField>
              <FormField label="New Start Date">
                <FormInput
                  type="date"
                  value={formData.updateStartDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, updateStartDate: e.target.value }))}
                />
              </FormField>
              <FormField label="New End Date">
                <FormInput
                  type="date"
                  value={formData.updateEndDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, updateEndDate: e.target.value }))}
                />
              </FormField>
              <Button type="submit" variant="primary" isLoading={updateSeasonMutation.isPending}>
                Update Season
              </Button>
              <TestResultDisplay testName="update" isLoading={updateSeasonMutation.isPending} result={results.update} />
            </form>
          </FormSection>
        </div>

        {/* Right Column: Seasons List */}
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h4>Seasons ({seasons.length})</h4>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
              Click a season to manage its players below
            </p>
          </div>
          <TestResultDisplay testName="setActive" isLoading={setActiveMutation.isPending} result={results.setActive} />
          <TestResultDisplay testName="delete" isLoading={deleteSeasonMutation.isPending} result={results.delete} />

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {seasons.map((season) => {
              const isSelected = selectedSeasonId === season.id;
              return (
                <div
                  key={season.id}
                  onClick={() => setSelectedSeasonId(isSelected ? '' : season.id)}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    background: isSelected ? '#fff3cd' : season.is_active ? '#e7f3ff' : 'white',
                    border: `2px solid ${isSelected ? '#ffc107' : season.is_active ? '#007bff' : '#dee2e6'}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong>{season.name}</strong>
                        {season.is_active && (
                          <span style={{ fontSize: '0.75rem', color: '#28a745', fontWeight: 'bold' }}>[ACTIVE]</span>
                        )}
                        {isSelected && (
                          <span style={{ fontSize: '0.75rem', color: '#856404', fontWeight: 'bold' }}>[SELECTED]</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                        {season.start_date} - {season.end_date}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>
                      {season.id.substring(0, 8)}...
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                    <Button
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          updateId: season.id,
                          updateName: season.name,
                          updateStartDate: season.start_date,
                          updateEndDate: season.end_date,
                        }));
                        document.querySelector('[data-update-form]')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      variant="primary"
                      style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                    >
                      Edit
                    </Button>
                    {!season.is_active && (
                      <Button
                        onClick={() => handleSetActive(season.id)}
                        disabled={setActiveMutation.isPending}
                        variant="success"
                        style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                      >
                        Set Active
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDelete(season.id)}
                      disabled={deleteSeasonMutation.isPending}
                      variant="danger"
                      style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Season Players Management - Full Width Section */}
      {selectedSeason && (
        <div style={{ marginTop: '2rem' }}>
          <SeasonPlayersPanel seasonId={selectedSeason.id} seasonName={selectedSeason.name} />
        </div>
      )}
    </div>
  );
}

// ============================================
// Season Players Panel Component
// ============================================

interface SeasonPlayersPanelProps {
  seasonId: string;
  seasonName: string;
}

function SeasonPlayersPanel({ seasonId, seasonName }: SeasonPlayersPanelProps) {
  const { data: seasonPlayers = [], isLoading: isLoadingPlayers } = useSeasonPlayers(seasonId);
  const { data: allPlayers = [] } = useQuery<Player[]>({
    queryKey: ['players', 'all'],
    queryFn: () => getPlayers(),
    staleTime: 30 * 1000,
  });
  const { data: teamsResult } = useQuery({
    queryKey: ['teams', 'all'],
    queryFn: () => testGetAllTeams(),
    staleTime: 30 * 1000,
  });
  const teams: Team[] = teamsResult?.data || [];

  const addPlayersMutation = useAddPlayersToSeason();
  const removePlayerMutation = useRemovePlayerFromSeason();
  const updateValueMutation = useUpdateSeasonPlayerValue();
  const setActiveMutation = useSetSeasonPlayerActive();
  const updateTeamMutation = useUpdateSeasonPlayerTeam();

  // Selected players for bulk add
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Get players not already in this season
  const availablePlayers = allPlayers.filter(
    (p) => !seasonPlayers.some((sp) => sp.player_id === p.id)
  );

  const handleTogglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedPlayerIds.size === availablePlayers.length) {
      // Deselect all
      setSelectedPlayerIds(new Set());
    } else {
      // Select all
      setSelectedPlayerIds(new Set(availablePlayers.map((p) => p.id)));
    }
  };

  const handleAddSelectedPlayers = async () => {
    if (selectedPlayerIds.size === 0) return;

    // Build player list with their default starting values and team assignments
    const playersToAdd = Array.from(selectedPlayerIds).map((playerId) => {
      const player = allPlayers.find((p) => p.id === playerId);
      return {
        playerId,
        startingValue: player?.starting_value || 0,
        teamId: player?.team_id, // Use player's current team as default
      };
    });

    await addPlayersMutation.mutateAsync({
      seasonId,
      players: playersToAdd,
    });

    // Clear selection after successful add
    setSelectedPlayerIds(new Set());
  };

  const handleUpdateTeam = async (playerId: string, teamId: string | null) => {
    await updateTeamMutation.mutateAsync({
      seasonId,
      playerId,
      teamId,
    });
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!confirm('Remove this player from the season?')) return;
    await removePlayerMutation.mutateAsync({ seasonId, playerId });
  };

  const handleUpdateValue = async (playerId: string) => {
    await updateValueMutation.mutateAsync({
      seasonId,
      playerId,
      startingValue: parseFloat(editValue) || 0,
    });
    setEditingPlayerId(null);
    setEditValue('');
  };

  const handleToggleActive = async (sp: SeasonPlayerWithPlayer) => {
    await setActiveMutation.mutateAsync({
      seasonId,
      playerId: sp.player_id,
      isActive: !sp.is_active,
    });
  };

  if (isLoadingPlayers) {
    return (
      <div style={{ padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px', border: '2px solid #ffc107' }}>
        <h4 style={{ margin: 0, marginBottom: '1rem' }}>Season Players: {seasonName}</h4>
        <p>Loading players...</p>
      </div>
    );
  }

  const allSelected = availablePlayers.length > 0 && selectedPlayerIds.size === availablePlayers.length;
  const someSelected = selectedPlayerIds.size > 0;

  return (
    <div style={{ padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px', border: '2px solid #ffc107' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h4 style={{ margin: 0 }}>Season Players: {seasonName}</h4>
          <p style={{ margin: 0, marginTop: '0.25rem', color: '#666', fontSize: '0.9rem' }}>
            {seasonPlayers.length} player{seasonPlayers.length !== 1 ? 's' : ''} assigned to this season
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Add Players */}
        <div style={{ padding: '1rem', background: 'white', borderRadius: '4px', border: '1px solid #dee2e6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h5 style={{ margin: 0 }}>Available Players ({availablePlayers.length})</h5>
            {availablePlayers.length > 0 && (
              <Button
                onClick={handleSelectAll}
                variant="secondary"
                style={{ fontSize: '0.85rem', padding: '0.25rem 0.75rem' }}
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>

          {availablePlayers.length === 0 ? (
            <div style={{ padding: '1rem', background: '#d4edda', borderRadius: '4px', textAlign: 'center' }}>
              All players are already in this season.
            </div>
          ) : (
            <>
              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: '4px', marginBottom: '0.75rem' }}>
                {availablePlayers.map((player) => {
                  const isSelected = selectedPlayerIds.has(player.id);
                  return (
                    <label
                      key={player.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        cursor: 'pointer',
                        background: isSelected ? '#e7f3ff' : 'transparent',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTogglePlayer(player.id)}
                        style={{ marginRight: '0.75rem' }}
                      />
                      <span style={{ flex: 1 }}>
                        {player.first_name} {player.last_name}
                      </span>
                      <span style={{ color: '#666', fontSize: '0.85rem' }}>
                        ${player.starting_value.toFixed(2)}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
                  Players added with their default value
                </p>
                <Button
                  onClick={handleAddSelectedPlayers}
                  variant="success"
                  disabled={!someSelected || addPlayersMutation.isPending}
                  style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                >
                  {addPlayersMutation.isPending ? 'Adding...' : `Add Selected (${selectedPlayerIds.size})`}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Current Season Players */}
        <div style={{ padding: '1rem', background: 'white', borderRadius: '4px', border: '1px solid #dee2e6' }}>
          <h5 style={{ margin: 0, marginBottom: '0.75rem' }}>Season Roster ({seasonPlayers.length})</h5>

          {seasonPlayers.length === 0 ? (
            <div style={{ padding: '1rem', background: '#fff3cd', borderRadius: '4px', textAlign: 'center' }}>
              No players in this season yet. Select players from the left and click &quot;Add Selected&quot;.
            </div>
          ) : (
            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#e9ecef' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Player</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Team</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>Value</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Active</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {seasonPlayers.map((sp) => (
                    <tr key={sp.id} style={{ opacity: sp.is_active ? 1 : 0.6 }}>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                        {sp.player?.first_name} {sp.player?.last_name}
                        {!sp.is_active && <span style={{ color: '#dc3545', marginLeft: '0.5rem' }}>(inactive)</span>}
                      </td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                        <select
                          value={sp.team_id || ''}
                          onChange={(e) => handleUpdateTeam(sp.player_id, e.target.value || null)}
                          disabled={updateTeamMutation.isPending}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.85rem',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            background: sp.team?.color ? `${sp.team.color}20` : 'white',
                            minWidth: '120px',
                          }}
                        >
                          <option value="">-- No Team --</option>
                          {teams.filter(t => !t.deleted_at).map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>
                        {editingPlayerId === sp.player_id ? (
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              style={{ width: '80px', padding: '0.25rem', borderRadius: '4px', border: '1px solid #ddd' }}
                              step="0.01"
                              autoFocus
                            />
                            <Button
                              onClick={() => handleUpdateValue(sp.player_id)}
                              variant="success"
                              disabled={updateValueMutation.isPending}
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Save
                            </Button>
                            <Button
                              onClick={() => setEditingPlayerId(null)}
                              variant="secondary"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <span
                            onClick={() => {
                              setEditingPlayerId(sp.player_id);
                              setEditValue(String(sp.starting_value));
                            }}
                            style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                            title="Click to edit"
                          >
                            ${sp.starting_value.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                        <input
                          type="checkbox"
                          checked={sp.is_active}
                          onChange={() => handleToggleActive(sp)}
                          disabled={setActiveMutation.isPending}
                        />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>
                        <Button
                          onClick={() => handleRemovePlayer(sp.player_id)}
                          variant="danger"
                          disabled={removePlayerMutation.isPending}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

