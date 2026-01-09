'use client';

import { useState } from 'react';
import { useTeamsIncludingDeleted } from '@/lib/queries/teams.queries';
import {
  useTestCreateTeam,
  useTestUpdateTeam,
  useTestSoftDeleteTeam,
  useTestHardDeleteTeam,
  useTestRestoreTeam,
} from '@/lib/queries/teams-test.queries';
import { useSeasonPlayers, useUpdateSeasonPlayerTeam } from '@/lib/queries/seasons.queries';
import { testGetTeam, testGetAllTeams } from '@/lib/api';
import {
  TestResultDisplay,
  FormField,
  FormInput,
  FormSection,
  Button,
  formatDate,
  FormSelect,
} from './shared/crud-components';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { getErrorMessage } from '@/lib/utils';
import { Team } from '@/lib/domain/types';

interface TestResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface TeamsCrudClientProps {
  seasonId?: string;
}

export default function TeamsCrudClient({ seasonId }: TeamsCrudClientProps) {
  const { data: teams = [], isLoading: isLoadingTeams, error: teamsError } = useTeamsIncludingDeleted();
  const { data: seasonPlayers = [] } = useSeasonPlayers(seasonId || '');
  
  // Mutations
  const createTeamMutation = useTestCreateTeam();
  const updateTeamMutation = useTestUpdateTeam();
  const softDeleteMutation = useTestSoftDeleteTeam();
  const hardDeleteMutation = useTestHardDeleteTeam();
  const restoreMutation = useTestRestoreTeam();
  const updatePlayerTeamMutation = useUpdateSeasonPlayerTeam();
  
  // Local state for test results and form data
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    createName: '',
    createColor: '',
    updateName: '',
    updateColor: '',
    getById: '',
  });

  const runTest = async (testName: string, testFn: () => Promise<TestResult<Team | Team[] | null>>) => {
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
      const result = await createTeamMutation.mutateAsync({
        name: formData.createName,
        color: formData.createColor || undefined,
      });
      setResults((prev) => ({ ...prev, create: result }));
      setFormData((prev) => ({ ...prev, createName: '', createColor: '' }));
      setIsCreateModalOpen(false);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults((prev) => ({
        ...prev,
        create: {
          success: false,
          message: message || 'Failed to create team',
          error: message,
        },
      }));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    
    try {
      const result = await updateTeamMutation.mutateAsync({
        teamId: editingTeam.id,
        updates: {
          name: formData.updateName || undefined,
          color: formData.updateColor || undefined,
        },
      });
      setResults((prev) => ({ ...prev, update: result }));
      if (result.success) {
        setEditingTeam(null);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults((prev) => ({
        ...prev,
        update: {
          success: false,
          message: message || 'Failed to update team',
          error: message,
        },
      }));
    }
  };
  
  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setFormData((prev) => ({
      ...prev,
      updateName: team.name,
      updateColor: team.color || '',
    }));
  };

  const handleSoftDelete = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    try {
      const result = await softDeleteMutation.mutateAsync(teamId);
      setResults((prev) => ({ ...prev, softDelete: result }));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults((prev) => ({
        ...prev,
        softDelete: {
          success: false,
          message: message || 'Failed to soft delete team',
          error: message,
        },
      }));
    }
  };

  const handleHardDelete = async (teamId: string) => {
    if (!confirm('⚠️ WARNING: This will permanently delete the team and all their stats. Are you sure?')) return;
    try {
      const result = await hardDeleteMutation.mutateAsync(teamId);
      setResults((prev) => ({ ...prev, hardDelete: result }));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults((prev) => ({
        ...prev,
        hardDelete: {
          success: false,
          message: message || 'Failed to hard delete team',
          error: message,
        },
      }));
    }
  };

  const handleRestore = async (teamId: string) => {
    try {
      const result = await restoreMutation.mutateAsync(teamId);
      setResults((prev) => ({ ...prev, restore: result }));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults((prev) => ({
        ...prev,
        restore: {
          success: false,
          message: message || 'Failed to restore team',
          error: message,
        },
      }));
    }
  };

  const handleAssignPlayerToTeam = async (playerId: string, teamId: string | null) => {
    if (!seasonId) return;
    await updatePlayerTeamMutation.mutateAsync({
      seasonId,
      playerId,
      teamId,
    });
  };


  if (isLoadingTeams) {
    return (
      <div>
        <h3>🏈 Teams CRUD Operations</h3>
        <p>Loading teams...</p>
      </div>
    );
  }

  if (teamsError) {
    return (
      <div>
        <h3>🏈 Teams CRUD Operations</h3>
        <p style={{ color: 'red' }}>Error loading teams: {teamsError instanceof Error ? teamsError.message : 'Unknown error'}</p>
      </div>
    );
  }

  // Group players by team for the selected season
  const activeTeams = teams.filter((t) => !t.deleted_at);
  const playersByTeam = new Map<string, typeof seasonPlayers>();
  const unassignedPlayers: typeof seasonPlayers = [];

  for (const sp of seasonPlayers) {
    if (sp.team_id) {
      const existing = playersByTeam.get(sp.team_id) || [];
      existing.push(sp);
      playersByTeam.set(sp.team_id, existing);
    } else {
      unassignedPlayers.push(sp);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Teams</h3>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="success"
        >
          Create Team
        </Button>
      </div>

      {/* Team Roster Grid - Only show if season is selected */}
      {seasonId && seasonPlayers.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '1rem', color: '#495057' }}>
            Season Rosters
            <span style={{ fontWeight: 'normal', fontSize: '0.9rem', marginLeft: '0.5rem', color: '#6c757d' }}>
              ({seasonPlayers.length} players)
            </span>
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr auto',
            gap: '1rem',
            alignItems: 'start'
          }}>
            {/* Teams Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '1rem' 
            }}>
              {activeTeams.map((team) => {
                const teamPlayers = playersByTeam.get(team.id) || [];
                return (
                  <div
                    key={team.id}
                    style={{
                      padding: '1rem',
                      background: 'white',
                      border: '1px solid #dee2e6',
                      borderRadius: '8px',
                      borderTop: `4px solid ${team.color || '#6c757d'}`,
                      height: 'max-content',
                      minHeight: '200px',
                    }}
                  >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    marginBottom: '0.75rem',
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid #e9ecef'
                  }}>
                    {team.color && (
                      <span style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        background: team.color,
                        flexShrink: 0
                      }} />
                    )}
                    <strong style={{ fontSize: '0.95rem' }}>{team.name}</strong>
                    <span style={{ 
                      marginLeft: 'auto', 
                      fontSize: '0.8rem', 
                      color: '#6c757d',
                      background: '#f8f9fa',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '10px'
                    }}>
                      {teamPlayers.length}
                    </span>
                  </div>
                  {teamPlayers.length === 0 ? (
                    <p style={{ color: '#adb5bd', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                      No players assigned
                    </p>
                  ) : (
                    <ul style={{ 
                      margin: 0, 
                      padding: 0, 
                      listStyle: 'none',
                      fontSize: '0.9rem'
                    }}>
                      {teamPlayers.map((sp) => (
                        <li 
                          key={sp.id} 
                          style={{ 
                            padding: '0.25rem 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.5rem',
                            opacity: sp.is_active ? 1 : 0.5,
                            borderBottom: '1px solid #f8f9fa'
                          }}
                        >
                          <span style={{ flex: 1 }}>
                            {sp.player?.first_name} {sp.player?.last_name}
                            {!sp.is_active && <span style={{ color: '#dc3545', marginLeft: '0.25rem' }}>✗</span>}
                          </span>
                          <span style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                            ${sp.starting_value}
                          </span>
                          <select
                            value={sp.team_id || ''}
                            onChange={(e) => handleAssignPlayerToTeam(sp.player_id, e.target.value || null)}
                            disabled={updatePlayerTeamMutation.isPending}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.4rem',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              cursor: updatePlayerTeamMutation.isPending ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <option value="">Unassign</option>
                            {activeTeams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            </div>
            
            {/* Unassigned Players Card */}
            {unassignedPlayers.length > 0 && (
              <div
                style={{
                  padding: '1rem',
                  background: '#fff8e1',
                  border: '1px dashed #ffc107',
                  borderRadius: '8px',
                  height: 'max-content',
                  minHeight: '200px',
                  minWidth: '220px',
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '0.75rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid #ffe082'
                }}>
                  <span style={{ fontSize: '1rem' }}>⚠️</span>
                  <strong style={{ fontSize: '0.95rem', color: '#856404' }}>Unassigned</strong>
                  <span style={{ 
                    marginLeft: 'auto', 
                    fontSize: '0.8rem', 
                    color: '#856404',
                    background: '#fff3cd',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px'
                  }}>
                    {unassignedPlayers.length}
                  </span>
                </div>
                <ul style={{ 
                  margin: 0, 
                  padding: 0, 
                  listStyle: 'none',
                  fontSize: '0.9rem'
                }}>
                  {unassignedPlayers.map((sp) => (
                    <li 
                      key={sp.id} 
                      style={{ 
                        padding: '0.25rem 0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: sp.is_active ? 1 : 0.5,
                        borderBottom: '1px solid #ffe082'
                      }}
                    >
                      <span style={{ flex: 1 }}>
                        {sp.player?.first_name} {sp.player?.last_name}
                      </span>
                      <span style={{ color: '#856404', fontSize: '0.8rem' }}>
                        ${sp.starting_value}
                      </span>
                      <select
                        value=""
                        onChange={(e) => handleAssignPlayerToTeam(sp.player_id, e.target.value || null)}
                        disabled={updatePlayerTeamMutation.isPending}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.4rem',
                          border: '1px solid #ffc107',
                          borderRadius: '4px',
                          cursor: updatePlayerTeamMutation.isPending ? 'not-allowed' : 'pointer',
                          background: 'white',
                        }}
                      >
                        <option value="">Assign to team...</option>
                        {activeTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {seasonId && seasonPlayers.length === 0 && (
        <div style={{ 
          padding: '1rem', 
          background: '#e7f3ff', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          border: '1px solid #b6d4fe'
        }}>
          <p style={{ margin: 0, color: '#084298' }}>
            No players assigned to this season yet. Go to <strong>Seasons & Season Players</strong> to add players.
          </p>
        </div>
      )}

      <div>
        {/* Left Column: Teams List */}
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>Teams ({teams.length})</h4>
            <Button
              onClick={() => runTest('getAll', () => testGetAllTeams())}
              disabled={loading.getAll}
              variant="secondary"
            >
              Refresh
            </Button>
          </div>
          <TestResultDisplay testName="getAll" isLoading={loading.getAll} result={results.getAll} />
          <TestResultDisplay testName="restore" isLoading={restoreMutation.isPending} result={results.restore} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {teams.map((team) => {
              const isDeleted = !!team.deleted_at;
              return (
                <Card key={team.id}>
                  <div style={{ opacity: isDeleted ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ textDecoration: isDeleted ? 'line-through' : 'none', color: isDeleted ? '#6c757d' : 'inherit' }}>
                            {team.name}
                          </strong>
                          {isDeleted && (
                            <span style={{ fontSize: '0.75rem', color: '#dc3545', fontWeight: 'bold' }}>
                              [DELETED]
                            </span>
                          )}
                          {team.color && (
                            <span style={{ color: isDeleted ? '#999' : team.color }}>●</span>
                          )}
                        </div>
                        {isDeleted && team.deleted_at && (
                          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                            Deleted: {formatDate(team.deleted_at)}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>
                        {team.id.substring(0, 8)}...
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {!isDeleted && (
                        <>
                          <Button
                            onClick={() => openEditModal(team)}
                            variant="primary"
                            style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleSoftDelete(team.id)}
                            disabled={softDeleteMutation.isPending}
                            variant="danger"
                            style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                      {isDeleted && (
                        <>
                          <Button
                            onClick={() => handleRestore(team.id)}
                            disabled={restoreMutation.isPending}
                            variant="success"
                            style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                          >
                            {restoreMutation.isPending ? 'Restoring...' : 'Restore'}
                          </Button>
                          <Button
                            onClick={() => handleHardDelete(team.id)}
                            disabled={hardDeleteMutation.isPending}
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
            })}
          </div>
        </div>

      </div>

      {/* Create Team Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Team"
        width="550px"
      >
        <form onSubmit={handleCreate}>
          <FormField label="Name" required>
            <FormInput
              value={formData.createName}
              onChange={(e) => setFormData((prev) => ({ ...prev, createName: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Color (hex)">
            <FormInput
              value={formData.createColor}
              onChange={(e) => setFormData((prev) => ({ ...prev, createColor: e.target.value }))}
              placeholder="#FF5733"
            />
          </FormField>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button
              type="submit"
              variant="success"
              isLoading={createTeamMutation.isPending}
            >
              Create Team
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
            isLoading={createTeamMutation.isPending}
            result={results.create}
          />
        </form>
      </Modal>

      {/* Edit Team Modal */}
      <Modal
        isOpen={!!editingTeam}
        onClose={() => setEditingTeam(null)}
        title={`Edit Team: ${editingTeam?.name || ''}`}
      >
        <form onSubmit={handleUpdate}>
          <FormField label="Name">
            <FormInput
              value={formData.updateName}
              onChange={(e) => setFormData((prev) => ({ ...prev, updateName: e.target.value }))}
            />
          </FormField>
          <FormField label="Color (hex)">
            <FormInput
              value={formData.updateColor}
              onChange={(e) => setFormData((prev) => ({ ...prev, updateColor: e.target.value }))}
              placeholder="#FF5733"
            />
          </FormField>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateTeamMutation.isPending}
            >
              Save Changes
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingTeam(null)}
            >
              Cancel
            </Button>
          </div>
          <TestResultDisplay
            testName="update"
            isLoading={updateTeamMutation.isPending}
            result={results.update}
          />
        </form>
      </Modal>
    </div>
  );
}
