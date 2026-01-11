'use client';

import { useState } from 'react';
import { usePlayersIncludingInactive } from '@/lib/queries/players-test.queries';
import {
  useTestCreatePlayer,
  useTestUpdatePlayer,
  useTestSoftDeletePlayer,
  useTestHardDeletePlayer,
  useTestRestorePlayer,
} from '@/lib/queries/players-test.queries';
import { testGetPlayer, testGetAllPlayers } from '@/lib/api';
import { useActiveSeason } from '@/lib/queries/seasons.queries';
import { useSeasonPlayers } from '@/lib/queries/seasons.queries';
import {
  TestResultDisplay,
  FormField,
  FormInput,
  FormSelect,
  FormNumberInput,
  Button,
  FormSection,
} from './shared/crud-components';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { useTeamsIncludingDeleted } from '@/lib/queries/teams.queries';
import { getErrorMessage } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/fantasy-utils';
import { Player, PlayerRole, FantasyPosition } from '@/lib/domain/types';
import { PlayerAvailabilityTable } from './player-availability-table';

interface TestResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export default function PlayersCrudClient() {
  const { data: players = [], isLoading: isLoadingPlayers, error: playersError } = usePlayersIncludingInactive();
  const { data: teams = [] } = useTeamsIncludingDeleted();
  const { data: activeSeason } = useActiveSeason();
  const { data: seasonPlayers = [] } = useSeasonPlayers(activeSeason?.id || '');
  
  // Create a set of player IDs that are in the active season and active
  const activeSeasonPlayerIds = new Set<string>();
  seasonPlayers.forEach(sp => {
    if (sp.is_active && sp.player) {
      activeSeasonPlayerIds.add(sp.player_id);
    }
  });
  
  // Separate players: first active players in current season, then inactive/other season players
  const activeSeasonPlayersList = players.filter(p => p.is_active && activeSeasonPlayerIds.has(p.id));
  const otherPlayersList = players.filter(p => !p.is_active || !activeSeasonPlayerIds.has(p.id));
  
  // Mutations
  const createPlayerMutation = useTestCreatePlayer();
  const updatePlayerMutation = useTestUpdatePlayer();
  const softDeleteMutation = useTestSoftDeletePlayer();
  const hardDeleteMutation = useTestHardDeletePlayer();
  const restoreMutation = useTestRestorePlayer();
  
  // Local state for test results and form data
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    createTeamId: '',
    createFirstName: '',
    createLastName: '',
    createRole: 'player' as 'captain' | 'player' | 'marquee' | 'rookie_marquee' | 'reserve',
    createStartingValue: '0',
    createDraftOrder: '',
    updateTeamId: '',
    updateFirstName: '',
    updateLastName: '',
    updateRole: 'player' as 'captain' | 'player' | 'marquee' | 'rookie_marquee' | 'reserve',
    updatePosition: '' as '' | FantasyPosition,
    updateStartingValue: '',
    updateDraftOrder: '',
    getById: '',
  });

  const runTest = async (testName: string, testFn: () => Promise<TestResult<Player | Player[] | null>>) => {
    setLoading((prev) => ({ ...prev, [testName]: true }));
    try {
      const result = await testFn();
      setResults((prev) => ({ ...prev, [testName]: result }));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults((prev) => ({
        ...prev,
        [testName]: {
          success: false,
          message: 'Test failed',
          error: message,
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [testName]: false }));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createPlayerMutation.mutateAsync({
        teamId: formData.createTeamId,
        firstName: formData.createFirstName,
        lastName: formData.createLastName,
        role: formData.createRole,
        // Don't set startingValue or draftOrder when creating a player
        // startingValue: parseFloat(formData.createStartingValue) || 0,
        // draftOrder: formData.createDraftOrder ? parseInt(formData.createDraftOrder) : undefined,
      });
      setResults((prev) => ({ ...prev, create: result }));
      setFormData((prev) => ({
        ...prev,
        createTeamId: '',
        createFirstName: '',
        createLastName: '',
        createRole: 'player',
        createStartingValue: '0',
        createDraftOrder: '',
      }));
      setIsCreateModalOpen(false);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults((prev) => ({
        ...prev,
        create: {
          success: false,
          message: message || 'Failed to create player',
          error: message,
        },
      }));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    
    try {
      const updates: Partial<{
        team_id: string;
        first_name: string;
        last_name: string;
        player_role: PlayerRole;
        position: FantasyPosition;
        starting_value: number;
        draft_order: number;
      }> = {};
      if (formData.updateTeamId) updates.team_id = formData.updateTeamId;
      if (formData.updateFirstName) updates.first_name = formData.updateFirstName;
      if (formData.updateLastName) updates.last_name = formData.updateLastName;
      if (formData.updateRole) updates.player_role = formData.updateRole;
      // Position: include if set (empty string will be converted to null by API)
      if (formData.updatePosition !== '') {
        updates.position = formData.updatePosition;
      } else {
        // Explicitly set to null to clear position
        (updates as any).position = null;
      }
      if (formData.updateStartingValue) updates.starting_value = parseFloat(formData.updateStartingValue);
      if (formData.updateDraftOrder) updates.draft_order = parseInt(formData.updateDraftOrder);
      
      const result = await updatePlayerMutation.mutateAsync({
        playerId: editingPlayer.id,
        updates,
      });
      setResults((prev) => ({ ...prev, update: result }));
      if (result.success) {
        setEditingPlayer(null);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults((prev) => ({
        ...prev,
        update: {
          success: false,
          message: message || 'Failed to update player',
          error: message,
        },
      }));
    }
  };

  const openEditModal = (player: Player) => {
    setEditingPlayer(player);
    setFormData((prev) => ({
      ...prev,
      updateTeamId: player.team_id || '',
      updateFirstName: player.first_name,
      updateLastName: player.last_name,
      updateRole: player.player_role,
      updatePosition: player.position || '',
      updateStartingValue: player.starting_value?.toString() || '',
      updateDraftOrder: player.draft_order?.toString() || '',
    }));
  };

  const handleUpdatePosition = async (playerId: string, position: FantasyPosition | '') => {
    try {
      // Empty string will be converted to null by the API to clear the position
      const updates = {
        position: position || ('' as any), // API will convert empty string to null
      };
      
      await updatePlayerMutation.mutateAsync({
        playerId,
        updates: updates as any,
      });
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults((prev) => ({
        ...prev,
        updatePosition: {
          success: false,
          message: message || 'Failed to update position',
          error: message,
        },
      }));
    }
  };

  const handleSoftDelete = async (playerId: string) => {
    if (!confirm('Are you sure you want to soft delete this player?')) return;
    try {
      const result = await softDeleteMutation.mutateAsync(playerId);
      setResults((prev) => ({ ...prev, softDelete: result }));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults((prev) => ({
        ...prev,
        softDelete: {
          success: false,
          message: message || 'Failed to soft delete player',
          error: message,
        },
      }));
    }
  };

  const handleHardDelete = async (playerId: string) => {
    if (!confirm('⚠️ WARNING: This will permanently delete the player and all their stats. Are you sure?')) return;
    try {
      const result = await hardDeleteMutation.mutateAsync(playerId);
      setResults((prev) => ({ ...prev, hardDelete: result }));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults((prev) => ({
        ...prev,
        hardDelete: {
          success: false,
          message: message || 'Failed to hard delete player',
          error: message,
        },
      }));
    }
  };

  const handleRestore = async (playerId: string) => {
    try {
      const result = await restoreMutation.mutateAsync(playerId);
      setResults((prev) => ({ ...prev, restore: result }));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults((prev) => ({
        ...prev,
        restore: {
          success: false,
          message: message || 'Failed to restore player',
          error: message,
        },
      }));
    }
  };

  const roleOptions = [
    { value: 'captain', label: 'Captain' },
    { value: 'player', label: 'Player' },
    { value: 'marquee', label: 'Marquee' },
    { value: 'rookie_marquee', label: 'Rookie Marquee' },
    { value: 'reserve', label: 'Reserve' },
  ];

  if (isLoadingPlayers) {
    return (
      <div>
        <h3>👤 Players CRUD Operations</h3>
        <p>Loading players...</p>
      </div>
    );
  }

  if (playersError) {
    return (
      <div>
        <h3>👤 Players CRUD Operations</h3>
        <p style={{ color: 'red' }}>Error loading players: {playersError instanceof Error ? playersError.message : 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>Players</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column: Players List */}
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>Players ({players.length})</h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                onClick={() => runTest('getAll', () => testGetAllPlayers())}
                disabled={loading.getAll}
                variant="secondary"
              >
                Refresh
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                variant="success"
              >
                Create Player
              </Button>
            </div>
          </div>
          <TestResultDisplay testName="getAll" isLoading={loading.getAll} result={results.getAll} />
          <TestResultDisplay testName="restore" isLoading={restoreMutation.isPending} result={results.restore} />

          {/* Active Players in Current Season */}
          {activeSeasonPlayersList.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                Active Players ({activeSeason ? activeSeason.name : 'Current Season'}) ({activeSeasonPlayersList.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activeSeasonPlayersList.map((player) => {
                  return renderPlayerCard(
                    player,
                    false,
                    openEditModal,
                    handleSoftDelete,
                    handleRestore,
                    handleHardDelete,
                    softDeleteMutation.isPending,
                    restoreMutation.isPending,
                    hardDeleteMutation.isPending,
                    handleUpdatePosition,
                    updatePlayerMutation.isPending
                  );
                })}
              </div>
            </div>
          )}

          {/* Inactive/Other Season Players */}
          {otherPlayersList.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '600', color: '#6b7280' }}>
                Inactive / Other Season Players ({otherPlayersList.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {otherPlayersList.map((player) => {
                  const isInactive = !player.is_active;
                  return renderPlayerCard(
                    player,
                    isInactive,
                    openEditModal,
                    handleSoftDelete,
                    handleRestore,
                    handleHardDelete,
                    softDeleteMutation.isPending,
                    restoreMutation.isPending,
                    hardDeleteMutation.isPending,
                    handleUpdatePosition,
                    updatePlayerMutation.isPending
                  );
                })}
              </div>
            </div>
          )}

          {/* Fallback if no players */}
          {players.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              No players found. Click "Create Player" to add one.
            </div>
          )}
        </div>

        {/* Right Column: Player Availability Table */}
        <div>
          <Card>
            <PlayerAvailabilityTable />
          </Card>
        </div>
      </div>

      {/* Create Player Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Player"
        width="550px"
      >
        <form onSubmit={handleCreate}>
          <FormField label="Team" required>
            <FormSelect
              value={formData.createTeamId}
              onChange={(e) => setFormData((prev) => ({ ...prev, createTeamId: e.target.value }))}
              options={[
                { value: '', label: 'Select a team...' },
                ...teams.filter(t => !t.deleted_at).map(t => ({ value: t.id, label: t.name })),
              ]}
              required
            />
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              Sets the player&apos;s base/default team. Season-specific team assignments are managed when adding players to seasons.
            </p>
          </FormField>
          <FormField label="First Name" required>
            <FormInput
              value={formData.createFirstName}
              onChange={(e) => setFormData((prev) => ({ ...prev, createFirstName: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Last Name" required>
            <FormInput
              value={formData.createLastName}
              onChange={(e) => setFormData((prev) => ({ ...prev, createLastName: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Role" required>
            <FormSelect
              value={formData.createRole}
              onChange={(e) => setFormData((prev) => ({ ...prev, createRole: e.target.value as PlayerRole }))}
              options={roleOptions}
              required
            />
          </FormField>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button
              type="submit"
              variant="success"
              isLoading={createPlayerMutation.isPending}
            >
              Create Player
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
          <TestResultDisplay
            testName="create"
            isLoading={createPlayerMutation.isPending}
            result={results.create}
          />
        </form>
      </Modal>

      {/* Edit Player Modal */}
      <Modal
        isOpen={!!editingPlayer}
        onClose={() => setEditingPlayer(null)}
        title={`Edit Player: ${editingPlayer?.first_name || ''} ${editingPlayer?.last_name || ''}`}
        width="550px"
      >
        <form onSubmit={handleUpdate}>
          <FormField label="Team">
            <FormSelect
              value={formData.updateTeamId}
              onChange={(e) => setFormData((prev) => ({ ...prev, updateTeamId: e.target.value }))}
              options={[
                { value: '', label: 'No team' },
                ...teams.filter(t => !t.deleted_at).map(t => ({ value: t.id, label: t.name })),
              ]}
            />
          </FormField>
          <FormField label="First Name">
            <FormInput
              value={formData.updateFirstName}
              onChange={(e) => setFormData((prev) => ({ ...prev, updateFirstName: e.target.value }))}
            />
          </FormField>
          <FormField label="Last Name">
            <FormInput
              value={formData.updateLastName}
              onChange={(e) => setFormData((prev) => ({ ...prev, updateLastName: e.target.value }))}
            />
          </FormField>
          <FormField label="Role">
            <FormSelect
              value={formData.updateRole}
              onChange={(e) => setFormData((prev) => ({ ...prev, updateRole: e.target.value as PlayerRole }))}
              options={roleOptions}
            />
          </FormField>
          <FormField label="Position">
            <FormSelect
              value={formData.updatePosition}
              onChange={(e) => setFormData((prev) => ({ ...prev, updatePosition: e.target.value as '' | FantasyPosition }))}
              options={[
                { value: '', label: 'No position' },
                { value: 'handler', label: 'Handler' },
                { value: 'cutter', label: 'Cutter' },
                { value: 'receiver', label: 'Receiver' },
              ]}
            />
          </FormField>
          <FormField label="Starting Value">
            <FormNumberInput
              value={formData.updateStartingValue}
              onChange={(e) => setFormData((prev) => ({ ...prev, updateStartingValue: e.target.value }))}
              min="0"
              step="0.01"
            />
          </FormField>
          <FormField label="Draft Order">
            <FormNumberInput
              value={formData.updateDraftOrder}
              onChange={(e) => setFormData((prev) => ({ ...prev, updateDraftOrder: e.target.value }))}
              min="1"
            />
          </FormField>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button
              type="submit"
              variant="primary"
              isLoading={updatePlayerMutation.isPending}
            >
              Save Changes
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingPlayer(null)}
            >
              Cancel
            </Button>
          </div>
          <TestResultDisplay
            testName="update"
            isLoading={updatePlayerMutation.isPending}
            result={results.update}
          />
        </form>
      </Modal>
    </div>
  );
}

// Helper function to render a player card
function renderPlayerCard(
  player: Player,
  isInactive: boolean,
  openEditModal: (player: Player) => void,
  handleSoftDelete: (playerId: string) => void,
  handleRestore: (playerId: string) => void,
  handleHardDelete: (playerId: string) => void,
  isSoftDeleting: boolean,
  isRestoring: boolean,
  isHardDeleting: boolean,
  handleUpdatePosition: (playerId: string, position: FantasyPosition | '') => void,
  isUpdatingPosition: boolean
) {
  return (
    <Card key={player.id}>
      <div style={{ opacity: isInactive ? 0.6 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <strong style={{ textDecoration: isInactive ? 'line-through' : 'none', color: isInactive ? '#6c757d' : 'inherit' }}>
                {player.first_name} {player.last_name}
              </strong>
              {isInactive && (
                <span style={{ fontSize: '0.75rem', color: '#dc3545', fontWeight: 'bold' }}>
                  [INACTIVE]
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
              {player.player_role} • {formatCurrency(player.starting_value)}
              {player.draft_order && ` • Draft #${player.draft_order}`}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>
            {player.id.substring(0, 8)}...
          </div>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.25rem' }}>
            Position
          </label>
          <FormSelect
            value={player.position || ''}
            onChange={(e) => handleUpdatePosition(player.id, e.target.value as FantasyPosition | '')}
            disabled={isUpdatingPosition || isInactive}
            options={[
              { value: '', label: 'No position' },
              { value: 'handler', label: 'Handler' },
              { value: 'cutter', label: 'Cutter' },
              { value: 'receiver', label: 'Receiver' },
            ]}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!isInactive && (
            <>
              <Button
                onClick={() => openEditModal(player)}
                variant="primary"
                style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
              >
                Edit
              </Button>
              <Button
                onClick={() => handleSoftDelete(player.id)}
                disabled={isSoftDeleting}
                variant="danger"
                style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
              >
                Delete
              </Button>
            </>
          )}
          {isInactive && (
            <>
              <Button
                onClick={() => handleRestore(player.id)}
                disabled={isRestoring}
                variant="success"
                style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
              >
                {isRestoring ? 'Restoring...' : 'Restore'}
              </Button>
              <Button
                onClick={() => handleHardDelete(player.id)}
                disabled={isHardDeleting}
                variant="danger"
                style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
              >
                Delete Permanently
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

