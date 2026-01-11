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
  useWeeks,
  useCreateWeek,
  useCreateWeeks,
  useUpdateWeek,
  useDeleteWeek,
} from '@/lib/queries/seasons.queries';
import {
  useGamesByWeek,
  useCreateGame,
  useUpdateGame,
  useDeleteGame,
} from '@/lib/queries/games.queries';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlayers, getTeams, testGetAllTeams } from '@/lib/api';
import { formatCurrency } from '@/lib/utils/fantasy-utils';
import { utcToLocalDatetimeInput, localDatetimeInputToUtc, createUtcTimestampFromACST, getACSTDateComponents } from '@/lib/utils/date-utils';
import { useTestUpdatePlayer } from '@/lib/queries/players-test.queries';
import { seasonKeys } from '@/lib/queries/seasons.queries';
import {
  TestResultDisplay,
  FormField,
  FormInput,
  FormNumberInput,
  FormSelect,
  FormSection,
  Button,
  formatDate,
} from './shared/crud-components';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { Season, Player, Team, Week, Game, InsertGame, PlayerRole } from '@/lib/domain/types';
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
  const [managingPlayersSeasonId, setManagingPlayersSeasonId] = useState<string>('');
  const [managingWeeksSeasonId, setManagingWeeksSeasonId] = useState<string>('');
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    createName: '',
    createStartDate: '',
    createEndDate: '',
    createIsActive: false,
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
        setIsCreateModalOpen(false);
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
    if (!editingSeason) return;
    
    try {
      const result = await updateSeasonMutation.mutateAsync({
        id: editingSeason.id,
        name: formData.updateName || undefined,
        start_date: formData.updateStartDate || undefined,
        end_date: formData.updateEndDate || undefined,
      });
      setResults((prev) => ({ ...prev, update: result }));
      if (result.success) {
        setEditingSeason(null);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update season';
      setResults((prev) => ({
        ...prev,
        update: { success: false, message, error: message },
      }));
    }
  };

  const openEditModal = (season: Season) => {
    setEditingSeason(season);
    setFormData((prev) => ({
      ...prev,
      updateName: season.name,
      updateStartDate: season.start_date,
      updateEndDate: season.end_date,
    }));
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
  const managingPlayersSeason = seasons.find((s) => s.id === managingPlayersSeasonId);
  const managingWeeksSeason = seasons.find((s) => s.id === managingWeeksSeasonId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="success"
        >
          Create Season
        </Button>
      </div>

      {activeSeason && (
        <div style={{ padding: '0.75rem', background: '#d4edda', borderRadius: '4px', marginBottom: '1.5rem' }}>
          <strong>Active Season:</strong> {activeSeason.name} ({activeSeason.start_date} - {activeSeason.end_date})
        </div>
      )}

      <div>
        {/* Seasons List */}
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h4>Seasons ({seasons.length})</h4>
          </div>
          <TestResultDisplay testName="setActive" isLoading={setActiveMutation.isPending} result={results.setActive} />
          <TestResultDisplay testName="delete" isLoading={deleteSeasonMutation.isPending} result={results.delete} />

          <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {seasons.map((season) => {
              const isManagingPlayers = managingPlayersSeasonId === season.id;
              const isManagingWeeks = managingWeeksSeasonId === season.id;
              const isActive = season.is_active;
              
              // Determine background and border based on state
              let borderLeft = '4px solid transparent';
              let background = '#fff';
              
              if (isManagingPlayers || isManagingWeeks) {
                borderLeft = '4px solid #f59e0b';
                background = '#fffbeb';
              } else if (isActive) {
                borderLeft = '4px solid #10b981';
                background = '#ecfdf5';
              }
              
              return (
                <Card
                  key={season.id}
                  style={{
                    borderLeft,
                    background,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong>{season.name}</strong>
                        {isActive && (
                          <span style={{ 
                            fontSize: '0.7rem', 
                            background: '#10b981', 
                            color: 'white', 
                            padding: '0.15rem 0.4rem', 
                            borderRadius: '4px',
                            fontWeight: 600 
                          }}>
                            ACTIVE
                          </span>
                        )}
                        {(isManagingPlayers || isManagingWeeks) && (
                          <span style={{ 
                            fontSize: '0.7rem', 
                            background: '#f59e0b', 
                            color: 'white', 
                            padding: '0.15rem 0.4rem', 
                            borderRadius: '4px',
                            fontWeight: 600 
                          }}>
                            MANAGING
                          </span>
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
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button
                      onClick={() => openEditModal(season)}
                      variant="primary"
                      style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => setManagingPlayersSeasonId(isManagingPlayers ? '' : season.id)}
                      variant={isManagingPlayers ? 'secondary' : 'info'}
                      style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                    >
                      {isManagingPlayers ? 'Close Players' : 'Manage Players'}
                    </Button>
                    <Button
                      onClick={() => setManagingWeeksSeasonId(isManagingWeeks ? '' : season.id)}
                      variant={isManagingWeeks ? 'secondary' : 'info'}
                      style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                    >
                      {isManagingWeeks ? 'Close Weeks' : 'Manage Weeks'}
                    </Button>
                    {!isActive && (
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
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Season Players Management - Full Width Section */}
      {managingPlayersSeason && (
        <div style={{ marginTop: '2rem' }}>
          <SeasonPlayersPanel 
            seasonId={managingPlayersSeason.id} 
            seasonName={managingPlayersSeason.name} 
            onClose={() => setManagingPlayersSeasonId('')}
          />
        </div>
      )}

      {/* Season Weeks Management - Full Width Section */}
      {managingWeeksSeason && (
        <div style={{ marginTop: '2rem' }}>
          <WeeksPanel 
            seasonId={managingWeeksSeason.id} 
            seasonName={managingWeeksSeason.name} 
            onClose={() => setManagingWeeksSeasonId('')}
          />
        </div>
      )}

      {/* Create Season Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Season"
        width="550px"
      >
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
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button type="submit" variant="success" isLoading={createSeasonMutation.isPending}>
              Create Season
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
          </div>
          <TestResultDisplay testName="create" isLoading={createSeasonMutation.isPending} result={results.create} />
        </form>
      </Modal>

      {/* Edit Season Modal */}
      <Modal
        isOpen={!!editingSeason}
        onClose={() => setEditingSeason(null)}
        title={`Edit Season: ${editingSeason?.name || ''}`}
        width="550px"
      >
        <form onSubmit={handleUpdate}>
          <FormField label="Name">
            <FormInput
              value={formData.updateName}
              onChange={(e) => setFormData((prev) => ({ ...prev, updateName: e.target.value }))}
            />
          </FormField>
          <FormField label="Start Date">
            <FormInput
              type="date"
              value={formData.updateStartDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, updateStartDate: e.target.value }))}
            />
          </FormField>
          <FormField label="End Date">
            <FormInput
              type="date"
              value={formData.updateEndDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, updateEndDate: e.target.value }))}
            />
          </FormField>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateSeasonMutation.isPending}
            >
              Save Changes
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingSeason(null)}
            >
              Cancel
            </Button>
          </div>
          <TestResultDisplay testName="update" isLoading={updateSeasonMutation.isPending} result={results.update} />
        </form>
      </Modal>
    </div>
  );
}

// ============================================
// Season Players Panel Component
// ============================================

interface SeasonPlayersPanelProps {
  seasonId: string;
  seasonName: string;
  onClose?: () => void;
}

function SeasonPlayersPanel({ seasonId, seasonName, onClose }: SeasonPlayersPanelProps) {
  const queryClient = useQueryClient();
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
  const updatePlayerMutation = useTestUpdatePlayer();

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

  const handleUpdateRole = async (playerId: string, role: PlayerRole) => {
    await updatePlayerMutation.mutateAsync({
      playerId,
      updates: { player_role: role },
    });
    // Invalidate season players query to reflect the updated role
    queryClient.invalidateQueries({ queryKey: seasonKeys.players(seasonId) });
  };

  if (isLoadingPlayers) {
    return (
      <Card>
        <h4 style={{ margin: 0, marginBottom: '1rem' }}>Season Players: {seasonName}</h4>
        <p>Loading players...</p>
      </Card>
    );
  }

  const allSelected = availablePlayers.length > 0 && selectedPlayerIds.size === availablePlayers.length;
  const someSelected = selectedPlayerIds.size > 0;

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h4 style={{ margin: 0 }}>Season Players: {seasonName}</h4>
          <p style={{ margin: 0, marginTop: '0.25rem', color: '#6b7280', fontSize: '0.9rem' }}>
            {seasonPlayers.length} player{seasonPlayers.length !== 1 ? 's' : ''} assigned to this season
          </p>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="secondary" style={{ fontSize: '0.85rem', padding: '0.25rem 0.75rem' }}>
            Close
          </Button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        {/* Left Column: Add Players */}
        <div style={{ padding: '1rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
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
            <div style={{ padding: '1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', textAlign: 'center', color: '#059669' }}>
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
                        {formatCurrency(player.starting_value)}
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
        <div style={{ padding: '1rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
          <h5 style={{ margin: 0, marginBottom: '0.75rem' }}>Season Roster ({seasonPlayers.length})</h5>

          {seasonPlayers.length === 0 ? (
            <div style={{ padding: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', textAlign: 'center' }}>
              No players in this season yet. Select players from the left and click &quot;Add Selected&quot;.
            </div>
          ) : (
            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Player</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Role</th>
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
                          value={sp.player?.player_role || 'player'}
                          onChange={(e) => handleUpdateRole(sp.player_id, e.target.value as PlayerRole)}
                          disabled={updatePlayerMutation.isPending}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.85rem',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            minWidth: '120px',
                          }}
                        >
                          <option value="captain">Captain</option>
                          <option value="player">Player</option>
                          <option value="marquee">Marquee</option>
                          <option value="rookie_marquee">Rookie Marquee</option>
                          <option value="reserve">Reserve</option>
                        </select>
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
                            {formatCurrency(sp.starting_value)}
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
    </Card>
  );
}

// ============================================
// Weeks Panel Component
// ============================================

interface WeeksPanelProps {
  seasonId: string;
  seasonName: string;
  onClose?: () => void;
}

function WeeksPanel({ seasonId, seasonName, onClose }: WeeksPanelProps) {
  const { data: weeks = [], isLoading: isLoadingWeeks } = useWeeks(seasonId);
  const createWeekMutation = useCreateWeek();
  const createWeeksMutation = useCreateWeeks();
  const updateWeekMutation = useUpdateWeek();
  const deleteWeekMutation = useDeleteWeek();

  const [editingWeek, setEditingWeek] = useState<Week | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBatchCreateModalOpen, setIsBatchCreateModalOpen] = useState(false);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [formData, setFormData] = useState({
    createWeekNumber: '',
    createName: '',
    createGameDate: '',
    createIsDraftWeek: false,
    batchStartWeek: '',
    batchCount: '',
    batchFirstGameDate: '',
    batchNamePattern: '',
    batchIsDraftWeek: false,
    updateWeekNumber: '',
    updateName: '',
    updateGameDate: '',
    updateIsDraftWeek: false,
    updateTransferWindowOpen: false,
    updateTransferCutoffTime: '',
  });

  // Get used week numbers to show available ones
  const usedWeekNumbers = new Set(weeks.map(w => w.week_number));
  const maxWeekNumber = Math.max(...(weeks.length > 0 ? weeks.map(w => w.week_number) : [0]), 7);
  // Generate available week numbers up to max + 10 for flexibility
  const availableWeekNumbers = Array.from({ length: maxWeekNumber + 10 }, (_, i) => i + 1).filter(num => 
    !editingWeek 
      ? !usedWeekNumbers.has(num)
      : editingWeek.week_number === num || !usedWeekNumbers.has(num)
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createWeekMutation.mutateAsync({
        season_id: seasonId,
        week_number: parseInt(formData.createWeekNumber),
        name: formData.createName || undefined,
        start_date: formData.createGameDate || undefined,
        end_date: formData.createGameDate || undefined, // Same as start since games are on Monday
        is_draft_week: formData.createIsDraftWeek,
        transfer_window_open: false, // Default to closed when creating a week
      });
      setResults((prev) => ({ ...prev, create: result }));
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          createWeekNumber: '',
          createName: '',
          createGameDate: '',
          createIsDraftWeek: false,
        }));
        setIsCreateModalOpen(false);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create week';
      setResults((prev) => ({
        ...prev,
        create: { success: false, message, error: message },
      }));
    }
  };

  const handleBatchCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createWeeksMutation.mutateAsync({
        seasonId,
        startWeekNumber: parseInt(formData.batchStartWeek),
        count: parseInt(formData.batchCount),
        firstGameDate: formData.batchFirstGameDate,
        namePattern: formData.batchNamePattern || undefined,
        isDraftWeek: formData.batchIsDraftWeek,
      });
      setResults((prev) => ({ ...prev, batchCreate: result }));
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          batchStartWeek: '',
          batchCount: '',
          batchFirstGameDate: '',
          batchNamePattern: '',
          batchIsDraftWeek: false,
        }));
        setIsBatchCreateModalOpen(false);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create weeks';
      setResults((prev) => ({
        ...prev,
        batchCreate: { success: false, message, error: message },
      }));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWeek) return;
    
    try {
      const updateData: {
        id: string;
        week_number?: number;
        name?: string;
        start_date?: string;
        end_date?: string;
        is_draft_week?: boolean;
        transfer_window_open?: boolean;
        transfer_cutoff_time?: string;
      } = {
        id: editingWeek.id,
      };

      // Only include fields if they have changed
      if (formData.updateWeekNumber && parseInt(formData.updateWeekNumber) !== editingWeek.week_number) {
        updateData.week_number = parseInt(formData.updateWeekNumber);
      }
      if (formData.updateName !== (editingWeek.name || '')) {
        updateData.name = formData.updateName || undefined;
      }
      if (formData.updateGameDate !== (editingWeek.start_date || '')) {
        updateData.start_date = formData.updateGameDate || undefined;
        updateData.end_date = formData.updateGameDate || undefined; // Same as start since games are on Monday
      }
      if (formData.updateIsDraftWeek !== editingWeek.is_draft_week) {
        updateData.is_draft_week = formData.updateIsDraftWeek;
      }

      if (formData.updateTransferWindowOpen !== undefined && formData.updateTransferWindowOpen !== (editingWeek.transfer_window_open ?? false)) {
        updateData.transfer_window_open = formData.updateTransferWindowOpen;
      }

      if (formData.updateTransferCutoffTime !== '') {
        // Convert local datetime input to UTC ISO string
        updateData.transfer_cutoff_time = localDatetimeInputToUtc(formData.updateTransferCutoffTime);
      } else if (formData.updateTransferCutoffTime === '' && editingWeek.transfer_cutoff_time) {
        // Clear cutoff time if empty string
        updateData.transfer_cutoff_time = undefined;
      }

      const result = await updateWeekMutation.mutateAsync(updateData);
      setResults((prev) => ({ ...prev, update: result }));
      if (result.success) {
        setEditingWeek(null);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update week';
      setResults((prev) => ({
        ...prev,
        update: { success: false, message, error: message },
      }));
    }
  };

  const openEditModal = (week: Week) => {
    setEditingWeek(week);
    setFormData(prev => ({
      ...prev,
      updateWeekNumber: week.week_number.toString(),
      updateName: week.name || '',
      updateGameDate: week.start_date || week.end_date || '',
      updateIsDraftWeek: week.is_draft_week,
      updateTransferWindowOpen: week.transfer_window_open ?? false,
      updateTransferCutoffTime: week.transfer_cutoff_time 
        ? utcToLocalDatetimeInput(week.transfer_cutoff_time) // Convert UTC to local for datetime-local input
        : '',
    }));
  };

  const handleDelete = async (weekId: string) => {
    if (!confirm('Are you sure you want to delete this week? This will also delete all associated games.')) return;
    try {
      const result = await deleteWeekMutation.mutateAsync({ weekId, seasonId });
      setResults((prev) => ({ ...prev, delete: result }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete week';
      setResults((prev) => ({
        ...prev,
        delete: { success: false, message, error: message },
      }));
    }
  };

  if (isLoadingWeeks) {
    return (
      <Card>
        <h4 style={{ margin: 0, marginBottom: '1rem' }}>Weeks: {seasonName}</h4>
        <p>Loading weeks...</p>
      </Card>
    );
  }

  const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number);

  return (
    <>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h4 style={{ margin: 0 }}>Weeks: {seasonName}</h4>
            <p style={{ margin: 0, marginTop: '0.25rem', color: '#6b7280', fontSize: '0.9rem' }}>
              {weeks.length} week{weeks.length !== 1 ? 's' : ''} configured for this season
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              onClick={() => setIsBatchCreateModalOpen(true)}
              variant="success"
              style={{ fontSize: '0.85rem', padding: '0.25rem 0.75rem' }}
            >
              Batch Create Weeks
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="info"
              style={{ fontSize: '0.85rem', padding: '0.25rem 0.75rem' }}
            >
              Create Single Week
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="secondary" style={{ fontSize: '0.85rem', padding: '0.25rem 0.75rem' }}>
                Close
              </Button>
            )}
          </div>
        </div>

        <TestResultDisplay testName="delete" isLoading={deleteWeekMutation.isPending} result={results.delete} />

        {sortedWeeks.length === 0 ? (
          <div style={{ padding: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', textAlign: 'center' }}>
            No weeks configured yet. Click &quot;Create Week&quot; to add one.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {sortedWeeks.map((week) => (
              <WeekGamesCard
                key={week.id}
                week={week}
                seasonId={seasonId}
                onEdit={() => openEditModal(week)}
                onDelete={() => handleDelete(week.id)}
                isDeleting={deleteWeekMutation.isPending}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Create Week Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Week"
        width="550px"
      >
        <form onSubmit={handleCreate}>
          <FormField label="Week Number" required>
            <FormSelect
              value={formData.createWeekNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, createWeekNumber: e.target.value }))}
              options={[
                { value: '', label: 'Select week number...' },
                ...availableWeekNumbers.map(num => ({
                  value: num.toString(),
                  label: `Week ${num}`,
                })),
              ]}
              required
            />
            {usedWeekNumbers.size > 0 && (
              <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', margin: 0 }}>
                Used: {Array.from(usedWeekNumbers).sort((a, b) => a - b).join(', ')}
              </p>
            )}
          </FormField>
          <FormField label="Name (optional)">
            <FormInput
              value={formData.createName}
              onChange={(e) => setFormData(prev => ({ ...prev, createName: e.target.value }))}
              placeholder="e.g., Week 1 - Pool Play"
            />
          </FormField>
          <FormField label="Game Date (Monday)" required>
            <FormInput
              type="date"
              value={formData.createGameDate}
              onChange={(e) => setFormData(prev => ({ ...prev, createGameDate: e.target.value }))}
              required
            />
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', margin: 0 }}>
              All games are played on Monday, so this represents the week&apos;s game date.
            </p>
          </FormField>
          <FormField label="">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={formData.createIsDraftWeek}
                onChange={(e) => setFormData(prev => ({ ...prev, createIsDraftWeek: e.target.checked }))}
              />
              Mark as draft week
            </label>
          </FormField>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button type="submit" variant="success" isLoading={createWeekMutation.isPending}>
              Create Week
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
          </div>
          <TestResultDisplay testName="create" isLoading={createWeekMutation.isPending} result={results.create} />
        </form>
      </Modal>

      {/* Edit Week Modal */}
      <Modal
        isOpen={!!editingWeek}
        onClose={() => setEditingWeek(null)}
        title={`Edit Week: ${editingWeek?.week_number || ''}`}
        width="550px"
      >
        <form onSubmit={handleUpdate}>
          <FormField label="Week Number">
            <FormSelect
              value={formData.updateWeekNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, updateWeekNumber: e.target.value }))}
              options={[
                { value: '', label: 'Keep current' },
                ...availableWeekNumbers.map(num => ({
                  value: num.toString(),
                  label: `Week ${num}`,
                })),
              ]}
            />
          </FormField>
          <FormField label="Name">
            <FormInput
              value={formData.updateName}
              onChange={(e) => setFormData(prev => ({ ...prev, updateName: e.target.value }))}
              placeholder="e.g., Week 1 - Pool Play"
            />
          </FormField>
          <FormField label="Game Date (Monday)">
            <FormInput
              type="date"
              value={formData.updateGameDate}
              onChange={(e) => setFormData(prev => ({ ...prev, updateGameDate: e.target.value }))}
            />
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', margin: 0 }}>
              All games are played on Monday, so this represents the week&apos;s game date.
            </p>
          </FormField>
          <FormField label="">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={formData.updateIsDraftWeek}
                onChange={(e) => setFormData(prev => ({ ...prev, updateIsDraftWeek: e.target.checked }))}
              />
              Mark as draft week
            </label>
          </FormField>
          <FormField label="Transfer Window">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={formData.updateTransferWindowOpen ?? editingWeek?.transfer_window_open ?? false}
                onChange={(e) => setFormData(prev => ({ ...prev, updateTransferWindowOpen: e.target.checked }))}
              />
              Transfer window open
            </label>
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', margin: 0 }}>
              Allow users to make transfers for this week
            </p>
          </FormField>
          <FormField label="Transfer Cutoff Time">
            <FormInput
              type="datetime-local"
              value={formData.updateTransferCutoffTime || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, updateTransferCutoffTime: e.target.value }))}
            />
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', margin: 0 }}>
              Time when transfers lock for this week (before first game)
            </p>
          </FormField>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateWeekMutation.isPending}
            >
              Save Changes
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingWeek(null)}
            >
              Cancel
            </Button>
          </div>
          <TestResultDisplay testName="update" isLoading={updateWeekMutation.isPending} result={results.update} />
        </form>
      </Modal>

      {/* Batch Create Weeks Modal */}
      <Modal
        isOpen={isBatchCreateModalOpen}
        onClose={() => setIsBatchCreateModalOpen(false)}
        title="Batch Create Weeks"
        width="550px"
      >
        <form onSubmit={handleBatchCreate}>
          <FormField label="Start Week Number" required>
            <FormNumberInput
              value={formData.batchStartWeek}
              onChange={(e) => setFormData(prev => ({ ...prev, batchStartWeek: e.target.value }))}
              placeholder="1"
              min="1"
              required
            />
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', margin: 0 }}>
              First week number to create (e.g., 1 for Week 1)
            </p>
          </FormField>
          <FormField label="Number of Weeks to Create" required>
            <FormNumberInput
              value={formData.batchCount}
              onChange={(e) => setFormData(prev => ({ ...prev, batchCount: e.target.value }))}
              placeholder="7"
              min="1"
              required
            />
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', margin: 0 }}>
              How many weeks to create (will create weeks sequentially from start week number)
            </p>
          </FormField>
          <FormField label="First Game Date (Monday)" required>
            <FormInput
              type="date"
              value={formData.batchFirstGameDate}
              onChange={(e) => setFormData(prev => ({ ...prev, batchFirstGameDate: e.target.value }))}
              required
            />
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', margin: 0 }}>
              Game date for the first week. Subsequent weeks will be automatically spaced 7 days apart.
            </p>
          </FormField>
          <FormField label="Name Pattern (optional)">
            <FormInput
              value={formData.batchNamePattern}
              onChange={(e) => setFormData(prev => ({ ...prev, batchNamePattern: e.target.value }))}
              placeholder="Week {n} - Pool Play"
            />
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', margin: 0 }}>
              Use {'{n}'} as a placeholder for the week number. Example: &quot;Week {'{n}'} - Pool Play&quot; will create &quot;Week 1 - Pool Play&quot;, &quot;Week 2 - Pool Play&quot;, etc.
            </p>
          </FormField>
          <FormField label="">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={formData.batchIsDraftWeek}
                onChange={(e) => setFormData(prev => ({ ...prev, batchIsDraftWeek: e.target.checked }))}
              />
              Mark all as draft weeks
            </label>
          </FormField>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button type="submit" variant="success" isLoading={createWeeksMutation.isPending}>
              Create {formData.batchCount ? parseInt(formData.batchCount) || '' : ''} Weeks
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsBatchCreateModalOpen(false)}>
              Cancel
            </Button>
          </div>
          <TestResultDisplay testName="batchCreate" isLoading={createWeeksMutation.isPending} result={results.batchCreate} />
        </form>
      </Modal>
    </>
  );
}

// ============================================
// Week Games Card Component
// ============================================

interface WeekGamesCardProps {
  week: Week;
  seasonId: string;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function WeekGamesCard({ week, seasonId, onEdit, onDelete, isDeleting }: WeekGamesCardProps) {
  const { data: games = [], isLoading: isLoadingGames } = useGamesByWeek(week.id);
  const { data: teamsResult } = useQuery({
    queryKey: ['teams', 'all'],
    queryFn: () => testGetAllTeams(),
    staleTime: 5 * 60 * 1000,
  });
  const teams: Team[] = teamsResult?.data || [];
  const activeTeams = teams.filter(t => !t.deleted_at);

  const createGameMutation = useCreateGame();
  const updateGameMutation = useUpdateGame();
  const deleteGameMutation = useDeleteGame();

  const [expanded, setExpanded] = useState(false);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  // Local state for time inputs to prevent saving on every keystroke
  const [localTimeValues, setLocalTimeValues] = useState<Record<string, string>>({});

  const handleTeamChange = async (gameId: string, field: 'home_team_id' | 'away_team_id', teamId: string) => {
    try {
      const result = await updateGameMutation.mutateAsync({
        id: gameId,
        [field]: teamId || undefined,
      });
      setResults(prev => ({ ...prev, [`update-${gameId}`]: result }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update game';
      setResults(prev => ({
        ...prev,
        [`update-${gameId}`]: { success: false, message, error: message },
      }));
    }
  };

  const handleTimeInputChange = (gameId: string, timeString: string) => {
    // Update local state only - don't save yet
    setLocalTimeValues(prev => ({ ...prev, [gameId]: timeString }));
  };

  const handleTimeBlur = async (gameId: string) => {
    const timeString = localTimeValues[gameId];
    
    // If no local value, use the current game value
    const currentTimeString = timeString !== undefined 
      ? timeString 
      : getScheduledTimeString(games.find(g => g.id === gameId)?.scheduled_time);

    if (!currentTimeString || currentTimeString === '') {
      // If time is cleared, remove scheduled_time
      try {
        const result = await updateGameMutation.mutateAsync({
          id: gameId,
          scheduled_time: undefined,
        });
        setResults(prev => ({ ...prev, [`update-time-${gameId}`]: result }));
        // Clear local state
        setLocalTimeValues(prev => {
          const next = { ...prev };
          delete next[gameId];
          return next;
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update game time';
        setResults(prev => ({
          ...prev,
          [`update-time-${gameId}`]: { success: false, message, error: message },
        }));
      }
      return;
    }

    // Combine week's game date (Monday) with the selected time
    const gameDate = week.start_date || week.end_date;
    if (!gameDate) {
      alert('Week must have a game date set before scheduling game times');
      // Reset local state to original value
      setLocalTimeValues(prev => {
        const next = { ...prev };
        delete next[gameId];
        return next;
      });
      return;
    }

    try {
      // Parse the time string (HH:MM format from time input)
      const [hours, minutes] = currentTimeString.split(':').map(Number);
      
      // Create UTC timestamp from Adelaide time (ACST)
      const scheduledDateTime = createUtcTimestampFromACST(gameDate, hours, minutes);

      const result = await updateGameMutation.mutateAsync({
        id: gameId,
        scheduled_time: scheduledDateTime,
      });
      setResults(prev => ({ ...prev, [`update-time-${gameId}`]: result }));
      // Clear local state after successful save
      setLocalTimeValues(prev => {
        const next = { ...prev };
        delete next[gameId];
        return next;
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update game time';
      setResults(prev => ({
        ...prev,
        [`update-time-${gameId}`]: { success: false, message, error: message },
      }));
      // Reset local state to original value on error
      setLocalTimeValues(prev => {
        const next = { ...prev };
        delete next[gameId];
        return next;
      });
    }
  };

  const handleAddGame = async () => {
    if (activeTeams.length < 2) {
      alert('Need at least 2 teams to create a game');
      return;
    }

    // Determine default time based on number of existing games
    // First game: 6:30pm (18:30), Second game: 8:10pm (20:10)
    const existingGamesCount = games.length;
    let defaultTime: string | undefined;
    const gameDate = week.start_date || week.end_date;

      if (gameDate && /^\d{4}-\d{2}-\d{2}$/.test(gameDate)) {
        // Create UTC timestamp from Adelaide time (ACST)
        if (existingGamesCount === 0) {
          // First game: 6:30pm (18:30) ACST
          defaultTime = createUtcTimestampFromACST(gameDate, 18, 30);
        } else if (existingGamesCount === 1) {
          // Second game: 8:10pm (20:10) ACST
          defaultTime = createUtcTimestampFromACST(gameDate, 20, 10);
        }
        // If more than 2 games, no default time
      }

    try {
      const gameData: InsertGame = {
        week_id: week.id,
        home_team_id: activeTeams[0].id,
        away_team_id: activeTeams[1].id,
        is_completed: false,
      };
      
      // Only include scheduled_time if we have a default time
      if (defaultTime) {
        gameData.scheduled_time = defaultTime;
      }
      
      const result = await createGameMutation.mutateAsync(gameData);
      setResults(prev => ({ ...prev, create: result }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create game';
      setResults(prev => ({
        ...prev,
        create: { success: false, message, error: message },
      }));
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Delete this game? This will also delete all associated player stats.')) return;
    try {
      const result = await deleteGameMutation.mutateAsync({ gameId, weekId: week.id });
      setResults(prev => ({ ...prev, [`delete-${gameId}`]: result }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete game';
      setResults(prev => ({
        ...prev,
        [`delete-${gameId}`]: { success: false, message, error: message },
      }));
    }
  };

  const getTeamName = (teamId: string | null | undefined) => {
    if (!teamId) return '—';
    const team = activeTeams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  const getTeamColor = (teamId: string | null | undefined) => {
    if (!teamId) return undefined;
    const team = activeTeams.find(t => t.id === teamId);
    return team?.color;
  };

  const getScheduledTimeString = (scheduledTime: string | null | undefined): string => {
    if (!scheduledTime) return '';
    try {
      // Get ACST time components from UTC timestamp
      const acstComponents = getACSTDateComponents(scheduledTime);
      if (!acstComponents) return '';
      const hours = acstComponents.hours.toString().padStart(2, '0');
      const minutes = acstComponents.minutes.toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  return (
    <div
      style={{
        padding: '1rem',
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
      }}
    >
      {/* Week Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: expanded ? '1rem' : '0' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <strong>Week {week.week_number}</strong>
            {week.is_draft_week && (
              <span style={{ fontSize: '0.7rem', background: '#6366f1', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                DRAFT
              </span>
            )}
            {week.name && (
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>— {week.name}</span>
            )}
            {games.length > 0 && (
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                ({games.length} game{games.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          {(week.start_date || week.end_date) && (
            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Game Date: {week.start_date || week.end_date || 'Not set'}
            </div>
          )}
          {/* Transfer Window Status */}
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {week.transfer_window_open ? (
              <span style={{ 
                fontSize: '0.75rem', 
                background: '#10b981', 
                color: 'white', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '4px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span>✓</span> Transfer Window OPEN
              </span>
            ) : (
              <span style={{ 
                fontSize: '0.75rem', 
                background: '#ef4444', 
                color: 'white', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '4px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span>✗</span> Transfer Window CLOSED
              </span>
            )}
            {week.transfer_cutoff_time && (
              <span style={{ 
                fontSize: '0.75rem', 
                background: week.transfer_window_open ? '#fef3c7' : '#f3f4f6', 
                color: week.transfer_window_open ? '#92400e' : '#6b7280', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '4px',
                border: `1px solid ${week.transfer_window_open ? '#fbbf24' : '#d1d5db'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span>⏰</span> Cutoff: {new Date(week.transfer_cutoff_time).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
                {new Date(week.transfer_cutoff_time) < new Date() && (
                  <span style={{ marginLeft: '0.25rem', fontWeight: '600' }}>(PASSED)</span>
                )}
              </span>
            )}
            {!week.transfer_cutoff_time && week.transfer_window_open && (
              <span style={{ 
                fontSize: '0.75rem', 
                background: '#fef3c7', 
                color: '#92400e', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '4px',
                border: '1px solid #fbbf24'
              }}>
                ⚠️ No cutoff time set
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button
            onClick={() => setExpanded(!expanded)}
            variant="secondary"
            style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
          >
            {expanded ? '▼' : '▶'} Games
          </Button>
          <Button
            onClick={onEdit}
            variant="primary"
            style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
          >
            Edit
          </Button>
          <Button
            onClick={onDelete}
            variant="danger"
            disabled={isDeleting}
            style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Games Table (Expanded) */}
      {expanded && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
          {isLoadingGames ? (
            <p style={{ color: '#666', fontSize: '0.9rem' }}>Loading games...</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h5 style={{ margin: 0, fontSize: '1rem' }}>Games</h5>
                <Button
                  onClick={handleAddGame}
                  variant="success"
                  disabled={activeTeams.length < 2 || createGameMutation.isPending}
                  style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                >
                  + Add Game
                </Button>
              </div>

              {activeTeams.length < 2 && (
                <div style={{ padding: '0.75rem', background: '#fff3cd', border: '1px solid #fde68a', borderRadius: '4px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  Need at least 2 teams to create games. Add teams in the Teams section first.
                </div>
              )}

              {games.length === 0 ? (
                <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '4px', textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
                  No games scheduled. Click &quot;+ Add Game&quot; to create one.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Home Team</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>vs</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Away Team</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Time</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...games]
                        .sort((a, b) => {
                          // Sort by scheduled_time, with games without time at the end
                          if (!a.scheduled_time && !b.scheduled_time) return 0;
                          if (!a.scheduled_time) return 1;
                          if (!b.scheduled_time) return -1;
                          return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
                        })
                        .map((game) => (
                          <tr key={game.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <select
                              value={game.home_team_id || ''}
                              onChange={(e) => handleTeamChange(game.id, 'home_team_id', e.target.value)}
                              disabled={updateGameMutation.isPending}
                              style={{
                                padding: '0.5rem',
                                fontSize: '0.9rem',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                background: getTeamColor(game.home_team_id) ? `${getTeamColor(game.home_team_id)}20` : 'white',
                                minWidth: '150px',
                                width: '100%',
                              }}
                            >
                              <option value="">— Select Home Team —</option>
                              {activeTeams.map((team) => (
                                <option key={team.id} value={team.id} disabled={team.id === game.away_team_id}>
                                  {team.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', color: '#666', fontWeight: '500' }}>vs</td>
                          <td style={{ padding: '0.75rem' }}>
                            <select
                              value={game.away_team_id || ''}
                              onChange={(e) => handleTeamChange(game.id, 'away_team_id', e.target.value)}
                              disabled={updateGameMutation.isPending}
                              style={{
                                padding: '0.5rem',
                                fontSize: '0.9rem',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                background: getTeamColor(game.away_team_id) ? `${getTeamColor(game.away_team_id)}20` : 'white',
                                minWidth: '150px',
                                width: '100%',
                              }}
                            >
                              <option value="">— Select Away Team —</option>
                              {activeTeams.map((team) => (
                                <option key={team.id} value={team.id} disabled={team.id === game.home_team_id}>
                                  {team.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <input
                              type="time"
                              value={localTimeValues[game.id] !== undefined 
                                ? localTimeValues[game.id] 
                                : getScheduledTimeString(game.scheduled_time)}
                              onChange={(e) => handleTimeInputChange(game.id, e.target.value)}
                              onBlur={() => handleTimeBlur(game.id)}
                              disabled={updateGameMutation.isPending || !(week.start_date || week.end_date)}
                              style={{
                                padding: '0.5rem',
                                fontSize: '0.9rem',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                width: '100%',
                                minWidth: '120px',
                              }}
                            />
                            {!(week.start_date || week.end_date) && (
                              <p style={{ fontSize: '0.75rem', color: '#999', margin: '0.25rem 0 0 0' }}>
                                Set week date first
                              </p>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            <Button
                              onClick={() => handleDeleteGame(game.id)}
                              variant="danger"
                              disabled={deleteGameMutation.isPending}
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              ✕
                            </Button>
                          </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

