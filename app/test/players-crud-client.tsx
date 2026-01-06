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
import {
  TestResultDisplay,
  FormField,
  FormInput,
  FormSelect,
  FormNumberInput,
  Button,
  FormSection,
} from './shared/crud-components';
import { useTeamsIncludingDeleted } from '@/lib/queries/teams.queries';
import { getErrorMessage } from '@/lib/utils';
import { Player, PlayerRole } from '@/lib/domain/types';

interface TestResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export default function PlayersCrudClient() {
  const { data: players = [], isLoading: isLoadingPlayers, error: playersError } = usePlayersIncludingInactive();
  const { data: teams = [] } = useTeamsIncludingDeleted();
  
  // Mutations
  const createPlayerMutation = useTestCreatePlayer();
  const updatePlayerMutation = useTestUpdatePlayer();
  const softDeleteMutation = useTestSoftDeletePlayer();
  const hardDeleteMutation = useTestHardDeletePlayer();
  const restoreMutation = useTestRestorePlayer();
  
  // Local state for test results and form data
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    createTeamId: '',
    createFirstName: '',
    createLastName: '',
    createRole: 'player' as 'captain' | 'player' | 'marquee' | 'rookie_marquee' | 'reserve',
    createStartingValue: '0',
    createDraftOrder: '',
    updateId: '',
    updateTeamId: '',
    updateFirstName: '',
    updateLastName: '',
    updateRole: 'player' as 'captain' | 'player' | 'marquee' | 'rookie_marquee' | 'reserve',
    updateStartingValue: '',
    updateDraftOrder: '',
    deleteId: '',
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
        startingValue: parseFloat(formData.createStartingValue) || 0,
        draftOrder: formData.createDraftOrder ? parseInt(formData.createDraftOrder) : undefined,
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
    try {
      const updates: Partial<{
        team_id: string;
        first_name: string;
        last_name: string;
        player_role: PlayerRole;
        starting_value: number;
        draft_order: number;
      }> = {};
      if (formData.updateTeamId) updates.team_id = formData.updateTeamId;
      if (formData.updateFirstName) updates.first_name = formData.updateFirstName;
      if (formData.updateLastName) updates.last_name = formData.updateLastName;
      if (formData.updateRole) updates.player_role = formData.updateRole;
      if (formData.updateStartingValue) updates.starting_value = parseFloat(formData.updateStartingValue);
      if (formData.updateDraftOrder) updates.draft_order = parseInt(formData.updateDraftOrder);
      
      const result = await updatePlayerMutation.mutateAsync({
        playerId: formData.updateId,
        updates,
      });
      setResults((prev) => ({ ...prev, update: result }));
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
    if (!confirm('⚠️ WARNING: This will permanently delete the player. Are you sure?')) return;
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
      <h3>Players</h3>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Test Create, Read, Update, Delete (Soft), and Delete (Hard) operations for players
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column: Forms */}
        <div>
          {/* Create Player */}
          <FormSection title="Create Player">
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
              <FormField label="Starting Value" required>
                <FormNumberInput
                  value={formData.createStartingValue}
                  onChange={(e) => setFormData((prev) => ({ ...prev, createStartingValue: e.target.value }))}
                  min="0"
                  step="0.01"
                  required
                />
              </FormField>
              <FormField label="Draft Order">
                <FormNumberInput
                  value={formData.createDraftOrder}
                  onChange={(e) => setFormData((prev) => ({ ...prev, createDraftOrder: e.target.value }))}
                  min="1"
                />
              </FormField>
              <Button
                type="submit"
                variant="success"
                isLoading={createPlayerMutation.isPending}
              >
                Create Player
              </Button>
              <TestResultDisplay
                testName="create"
                isLoading={createPlayerMutation.isPending}
                result={results.create}
              />
            </form>
          </FormSection>

          {/* Update Player */}
          <FormSection title="Update Player">
            <div data-update-form>
            <form onSubmit={handleUpdate}>
              <FormField label="Player ID" required>
                <FormInput
                  value={formData.updateId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, updateId: e.target.value }))}
                  placeholder="Enter player UUID"
                  required
                />
              </FormField>
              <FormField label="Team">
                <FormSelect
                  value={formData.updateTeamId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, updateTeamId: e.target.value }))}
                  options={[
                    { value: '', label: 'No change' },
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
              <Button
                type="submit"
                variant="primary"
                isLoading={updatePlayerMutation.isPending}
              >
                Update Player
              </Button>
              <TestResultDisplay
                testName="update"
                isLoading={updatePlayerMutation.isPending}
                result={results.update}
              />
            </form>
            </div>
          </FormSection>

          {/* Get Player by ID */}
          <FormSection title="Get Player by ID">
            <div style={{ marginBottom: '0.75rem' }}>
              <FormInput
                value={formData.getById}
                onChange={(e) => setFormData((prev) => ({ ...prev, getById: e.target.value }))}
                placeholder="Enter player UUID"
                style={{ marginBottom: '0.5rem' }}
              />
              <Button
                onClick={() => runTest('getById', () => testGetPlayer(formData.getById))}
                disabled={loading.getById || !formData.getById}
                variant="info"
              >
                Get Player
              </Button>
            </div>
            <TestResultDisplay
              testName="getById"
              isLoading={loading.getById}
              result={results.getById}
            />
          </FormSection>
        </div>

        {/* Right Column: Players List */}
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>Players ({players.length})</h4>
            <Button
              onClick={() => runTest('getAll', () => testGetAllPlayers())}
              disabled={loading.getAll}
              variant="secondary"
            >
              Refresh
            </Button>
          </div>
          <TestResultDisplay testName="getAll" isLoading={loading.getAll} result={results.getAll} />
          <TestResultDisplay testName="restore" isLoading={restoreMutation.isPending} result={results.restore} />

          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {players.map((player) => {
              const isInactive = !player.is_active;
              return (
                <div
                  key={player.id}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    background: isInactive ? '#f8f9fa' : 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    opacity: isInactive ? 0.7 : 1,
                  }}
                >
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
                        {player.player_role} • ${player.starting_value}
                        {player.draft_order && ` • Draft #${player.draft_order}`}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>
                      {player.id.substring(0, 8)}...
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {!isInactive && (
                      <>
                        <Button
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              updateId: player.id,
                              updateTeamId: player.team_id || '',
                              updateFirstName: player.first_name,
                              updateLastName: player.last_name,
                              updateRole: player.player_role,
                              updateStartingValue: player.starting_value?.toString() || '',
                              updateDraftOrder: player.draft_order?.toString() || '',
                            }));
                            document.querySelector('[data-update-form]')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          variant="primary"
                          style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleSoftDelete(player.id)}
                          disabled={softDeleteMutation.isPending}
                          variant="warning"
                          style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                        >
                          Soft Delete
                        </Button>
                        <Button
                          onClick={() => handleHardDelete(player.id)}
                          disabled={hardDeleteMutation.isPending}
                          variant="danger"
                          style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                        >
                          Hard Delete
                        </Button>
                      </>
                    )}
                    {isInactive && (
                      <Button
                        onClick={() => handleRestore(player.id)}
                        disabled={restoreMutation.isPending}
                        variant="success"
                        style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                      >
                        {restoreMutation.isPending ? 'Restoring...' : 'Restore'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

