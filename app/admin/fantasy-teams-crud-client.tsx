'use client';

import { useState, useEffect } from 'react';
import {
  useUserProfiles,
  useFantasyTeams,
  useFantasyTeamWithPlayers,
  useAvailablePlayers,
  useCreateFantasyTeam,
  useUpdateFantasyTeam,
  useDeleteFantasyTeam,
  useAddPlayerToFantasyTeam,
  useRemovePlayerFromFantasyTeam,
  useSetFantasyTeamCaptain,
  useSetPlayerBenchStatus,
} from '@/lib/queries/fantasy-teams-test.queries';
import { useTestDashboard } from '@/lib/queries/test.queries';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { FantasyTeamScore } from '@/lib/domain/types';
import {
  TestResultDisplay,
  FormField,
  FormInput,
  FormSelect,
  Button,
  FormSection,
  formatDate,
} from './shared/crud-components';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { getErrorMessage } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/fantasy-utils';
import { Player, FantasyTeam } from '@/lib/domain/types';

interface FantasyTeamsCrudClientProps {
  seasonId?: string;
}

interface TestResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface FantasyTeamWithRelations extends FantasyTeam {
  user_profiles?: { email: string; display_name?: string };
  seasons?: { name: string };
}

interface FantasyTeamPlayer {
  id: string;
  fantasy_team_id: string;
  player_id: string;
  is_captain: boolean;
  is_reserve: boolean;
  is_active: boolean;
  players?: {
    id: string;
    first_name: string;
    last_name: string;
    player_role: string;
    starting_value: number;
    team_id?: string;
  };
}

interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  is_admin: boolean;
}

export default function FantasyTeamsCrudClient({ seasonId }: FantasyTeamsCrudClientProps) {
  // Data queries
  const { data: users = [], isLoading: isLoadingUsers, error: usersError } = useUserProfiles();
  const { data: fantasyTeams = [], isLoading: isLoadingTeams, error: teamsError } = useFantasyTeams(seasonId || null);
  
  // Selected team for editing
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const { data: selectedTeamData, isLoading: isLoadingSelectedTeam } = useFantasyTeamWithPlayers(selectedTeamId);
  const { data: availablePlayers = [] } = useAvailablePlayers(seasonId || null);
  
  // Clear selected team when season changes
  useEffect(() => {
    setSelectedTeamId(null);
  }, [seasonId]);
  
  // Mutations
  const createMutation = useCreateFantasyTeam();
  const updateMutation = useUpdateFantasyTeam();
  const deleteMutation = useDeleteFantasyTeam();
  const addPlayerMutation = useAddPlayerToFantasyTeam();
  const removePlayerMutation = useRemovePlayerFromFantasyTeam();
  const setCaptainMutation = useSetFantasyTeamCaptain();
  const setBenchMutation = useSetPlayerBenchStatus();
  
  // Form state
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    createName: '',
    createOwnerId: '',
    updateName: '',
    addPlayerId: '',
    addAsBench: false,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonId) {
      setResults(prev => ({
        ...prev,
        create: { success: false, message: 'No season selected', error: 'Select a season first' }
      }));
      return;
    }
    
    try {
      const result = await createMutation.mutateAsync({
        ownerId: formData.createOwnerId,
        seasonId: seasonId,
        name: formData.createName,
      });
      setResults(prev => ({ ...prev, create: result }));
      if (result.success) {
        setFormData(prev => ({ ...prev, createName: '', createOwnerId: '' }));
        setIsCreateModalOpen(false);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults(prev => ({
        ...prev,
        create: { success: false, message: message || 'Failed to create team', error: message }
      }));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    
    try {
      const result = await updateMutation.mutateAsync({
        fantasyTeamId: selectedTeamId,
        updates: { name: formData.updateName },
      });
      setResults(prev => ({ ...prev, update: result }));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults(prev => ({
        ...prev,
        update: { success: false, message: message || 'Failed to update team', error: message }
      }));
    }
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('⚠️ This will permanently delete the fantasy team and all its players. Are you sure?')) return;
    
    try {
      const result = await deleteMutation.mutateAsync(teamId);
      setResults(prev => ({ ...prev, delete: result }));
      if (result.success && selectedTeamId === teamId) {
        setSelectedTeamId(null);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults(prev => ({
        ...prev,
        delete: { success: false, message: message || 'Failed to delete team', error: message }
      }));
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !formData.addPlayerId) return;
    
    try {
      const result = await addPlayerMutation.mutateAsync({
        fantasyTeamId: selectedTeamId,
        playerId: formData.addPlayerId,
        isBench: formData.addAsBench,
      });
      setResults(prev => ({ ...prev, addPlayer: result }));
      if (result.success) {
        setFormData(prev => ({ ...prev, addPlayerId: '', addAsBench: false }));
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults(prev => ({
        ...prev,
        addPlayer: { success: false, message: message || 'Failed to add player', error: message }
      }));
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!selectedTeamId) return;
    if (!confirm('Remove this player from the team?')) return;
    
    try {
      const result = await removePlayerMutation.mutateAsync({
        fantasyTeamId: selectedTeamId,
        playerId,
      });
      setResults(prev => ({ ...prev, removePlayer: result }));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults(prev => ({
        ...prev,
        removePlayer: { success: false, message: message || 'Failed to remove player', error: message }
      }));
    }
  };

  const handleSetCaptain = async (playerId: string) => {
    if (!selectedTeamId) return;
    
    try {
      const result = await setCaptainMutation.mutateAsync({
        fantasyTeamId: selectedTeamId,
        playerId,
      });
      setResults(prev => ({ ...prev, setCaptain: result }));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults(prev => ({
        ...prev,
        setCaptain: { success: false, message: message || 'Failed to set captain', error: message }
      }));
    }
  };

  const handleToggleBench = async (playerId: string, currentlyBench: boolean) => {
    if (!selectedTeamId) return;
    
    try {
      const result = await setBenchMutation.mutateAsync({
        fantasyTeamId: selectedTeamId,
        playerId,
        isBench: !currentlyBench,
      });
      setResults(prev => ({ ...prev, toggleBench: result }));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setResults(prev => ({
        ...prev,
        toggleBench: { success: false, message: message || 'Failed to toggle bench status', error: message }
      }));
    }
  };

  if (isLoadingTeams || isLoadingUsers) {
    return (
      <div>
        <h3>⚽ Fantasy Teams CRUD</h3>
        <p>Loading...</p>
      </div>
    );
  }

  if (teamsError) {
    return (
      <div>
        <h3>⚽ Fantasy Teams CRUD</h3>
        <p style={{ color: 'red' }}>Error: {teamsError instanceof Error ? teamsError.message : 'Unknown error'}</p>
      </div>
    );
  }

  const typedFantasyTeams = fantasyTeams as FantasyTeamWithRelations[];
  const typedUsers = users as UserProfile[];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="success"
          disabled={!seasonId}
        >
          Create Fantasy Team
        </Button>
      </div>

      {/* Season Status */}
      {!seasonId && (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '0.75rem', 
          background: '#f8d7da', 
          borderRadius: '4px',
          fontSize: '0.9rem'
        }}>
          <strong>⚠️ No Season Selected:</strong> Select a season from the dropdown above to manage fantasy teams.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column: Fantasy Teams List */}
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>Fantasy Teams ({typedFantasyTeams.length})</h4>
          </div>
          <TestResultDisplay testName="delete" isLoading={deleteMutation.isPending} result={results.delete} />

          <div style={{ maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {typedFantasyTeams.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic', padding: '1rem', border: '1px dashed #d1d5db', borderRadius: '6px', textAlign: 'center', margin: 0 }}>
                No fantasy teams yet. Create one using the form.
              </p>
            ) : (
              typedFantasyTeams.map((team) => {
                return (
                  <Card key={team.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <strong>{team.name}</strong>
                        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                          Owner: {team.user_profiles?.display_name || team.user_profiles?.email || 'Unknown'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                          Season: {team.seasons?.name || 'Unknown'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                          Value: ${team.total_value?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>
                        {team.id.substring(0, 8)}...
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.5rem' }}>
                      Created: {formatDate(team.created_at)}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="primary"
                        style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => {
                          setSelectedTeamId(team.id);
                          setFormData(prev => ({ ...prev, updateName: team.name }));
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => handleDelete(team.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Points Per Week Table */}
        <div>
          <FantasyTeamScoresTable fantasyTeams={typedFantasyTeams} seasonId={seasonId || undefined} />
        </div>
      </div>

      {/* Create Fantasy Team Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Fantasy Team"
        width="550px"
      >
        <form onSubmit={handleCreate}>
          <FormField label="Team Name" required>
            <FormInput
              value={formData.createName}
              onChange={(e) => setFormData(prev => ({ ...prev, createName: e.target.value }))}
              placeholder="My Fantasy Team"
              required
            />
          </FormField>
          <FormField label="Owner" required>
            {usersError && (
              <div style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#f8d7da', borderRadius: '4px', fontSize: '0.85rem', color: '#721c24' }}>
                Error loading users: {usersError instanceof Error ? usersError.message : 'Unknown error'}
              </div>
            )}
            {isLoadingUsers ? (
              <div style={{ padding: '0.5rem', color: '#666' }}>Loading users...</div>
            ) : typedUsers.length === 0 ? (
              <div style={{ padding: '0.5rem', background: '#fff3cd', borderRadius: '4px', fontSize: '0.85rem' }}>
                No users found. Check the Users table above.
              </div>
            ) : (
              <FormSelect
                value={formData.createOwnerId}
                onChange={(e) => setFormData(prev => ({ ...prev, createOwnerId: e.target.value }))}
                options={[
                  { value: '', label: `Select owner (${typedUsers.length} available)...` },
                  ...typedUsers.map(u => ({ 
                    value: u.id, 
                    label: `${u.display_name || u.email}${u.is_admin ? ' (Admin)' : ''}` 
                  })),
                ]}
                required
              />
            )}
          </FormField>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button
              type="submit"
              variant="success"
              isLoading={createMutation.isPending}
              disabled={!seasonId}
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
          <TestResultDisplay testName="create" isLoading={createMutation.isPending} result={results.create} />
        </form>
      </Modal>

      {/* Edit Fantasy Team Modal */}
      <Modal
        isOpen={!!selectedTeamId && !!selectedTeamData}
        onClose={() => setSelectedTeamId(null)}
        title={`Edit: ${selectedTeamData?.team.name || ''}`}
        width="650px"
      >
        {selectedTeamData && (
          <>
            <form onSubmit={handleUpdate}>
              <FormField label="Team Name">
                <FormInput
                  value={formData.updateName}
                  onChange={(e) => setFormData(prev => ({ ...prev, updateName: e.target.value }))}
                  placeholder={selectedTeamData.team.name}
                />
              </FormField>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={updateMutation.isPending}
                >
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedTeamId(null)}
                >
                  Cancel
                </Button>
              </div>
              <TestResultDisplay testName="update" isLoading={updateMutation.isPending} result={results.update} />
            </form>

            {/* Add Player Form */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #dee2e6' }}>
              <h5 style={{ marginBottom: '0.75rem' }}>Add Player</h5>
              <form onSubmit={handleAddPlayer}>
                <FormField label="Player">
                  <FormSelect
                    value={formData.addPlayerId}
                    onChange={(e) => setFormData(prev => ({ ...prev, addPlayerId: e.target.value }))}
                    options={[
                      { value: '', label: 'Select player...' },
                      ...availablePlayers.map((p: Player) => ({ 
                        value: p.id, 
                        label: `${p.first_name} ${p.last_name} (${formatCurrency(p.starting_value)})` 
                      })),
                    ]}
                  />
                </FormField>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.addAsBench}
                      onChange={(e) => setFormData(prev => ({ ...prev, addAsBench: e.target.checked }))}
                    />
                    Add as Bench player
                  </label>
                </div>
                <Button
                  type="submit"
                  variant="success"
                  isLoading={addPlayerMutation.isPending}
                  disabled={!formData.addPlayerId}
                >
                  Add Player
                </Button>
                <TestResultDisplay testName="addPlayer" isLoading={addPlayerMutation.isPending} result={results.addPlayer} />
              </form>
            </div>

            {/* Players List */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #dee2e6' }}>
              <h5 style={{ marginBottom: '0.75rem' }}>Team Players ({selectedTeamData.players.length})</h5>
              {selectedTeamData.players.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedTeamData.players.map((tp) => (
                    <div key={tp.id} style={{ 
                      padding: '0.75rem', 
                      background: '#f8f9fa', 
                      borderRadius: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: '500' }}>
                          {tp.players?.first_name} {tp.players?.last_name}
                          {tp.is_captain && <span style={{ marginLeft: '0.5rem', color: '#ffc107' }}>👑</span>}
                          {tp.is_reserve && <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#6c757d' }}>(Bench)</span>}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                          {tp.players?.player_role} • {formatCurrency(tp.players?.starting_value)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!tp.is_captain && (
                          <Button
                            variant="warning"
                            style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                            onClick={() => handleSetCaptain(tp.player_id)}
                            disabled={setCaptainMutation.isPending}
                          >
                            👑
                          </Button>
                        )}
                        <Button
                          variant={tp.is_reserve ? 'success' : 'warning'}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                          onClick={() => handleToggleBench(tp.player_id, tp.is_reserve)}
                          disabled={setBenchMutation.isPending}
                        >
                          {tp.is_reserve ? '↑' : '↓'}
                        </Button>
                        <Button
                          variant="danger"
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                          onClick={() => handleRemovePlayer(tp.player_id)}
                          disabled={removePlayerMutation.isPending}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#666', fontStyle: 'italic' }}>No players on this team yet</p>
              )}
              <TestResultDisplay testName="removePlayer" isLoading={removePlayerMutation.isPending} result={results.removePlayer} />
              <TestResultDisplay testName="setCaptain" isLoading={setCaptainMutation.isPending} result={results.setCaptain} />
              <TestResultDisplay testName="toggleBench" isLoading={setBenchMutation.isPending} result={results.toggleBench} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

// Points Per Week Table Component
function FantasyTeamScoresTable({ fantasyTeams, seasonId }: { fantasyTeams: FantasyTeamWithRelations[]; seasonId?: string }) {
  const { data: dashboardData } = useTestDashboard(seasonId);
  const weeks = dashboardData?.weeks || [];

  // Fetch fantasy team scores
  const { data: scores = [] } = useQuery({
    queryKey: ['fantasyTeamScores', seasonId],
    queryFn: async () => {
      if (!seasonId || fantasyTeams.length === 0) return [];
      const supabase = createClient();
      const teamIds = fantasyTeams.map(t => t.id);
      
      const { data, error } = await supabase
        .from('fantasy_team_scores')
        .select('*')
        .in('fantasy_team_id', teamIds);
      
      if (error) throw error;
      return (data || []) as FantasyTeamScore[];
    },
    enabled: !!seasonId && fantasyTeams.length > 0,
  });

  if (!seasonId || weeks.length === 0) {
    return (
      <Card>
        <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Points Per Week</h4>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
          {!seasonId ? 'Select a season to view points' : 'No weeks found for this season'}
        </p>
      </Card>
    );
  }

  const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number);
  
  // Create a map of team_id -> week_id -> score
  const scoresMap = new Map<string, Map<string, number>>();
  scores.forEach(score => {
    if (!scoresMap.has(score.fantasy_team_id)) {
      scoresMap.set(score.fantasy_team_id, new Map());
    }
    scoresMap.get(score.fantasy_team_id)!.set(score.week_id, score.total_points);
  });

  return (
    <Card>
      <h4 style={{ margin: 0, marginBottom: '1rem' }}>Points Per Week</h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', position: 'sticky', left: 0, background: '#f8f9fa', zIndex: 1 }}>
                Team
              </th>
              {sortedWeeks.map((week) => (
                <th key={week.id} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', minWidth: '80px' }}>
                  W{week.week_number}
                </th>
              ))}
              <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', background: '#e7f3ff', minWidth: '80px' }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {fantasyTeams.length === 0 ? (
              <tr>
                <td colSpan={sortedWeeks.length + 2} style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                  No fantasy teams
                </td>
              </tr>
            ) : (
              fantasyTeams.map((team) => {
                const teamScores = scoresMap.get(team.id) || new Map();
                let totalPoints = 0;
                
                return (
                  <tr key={team.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '0.75rem', position: 'sticky', left: 0, background: 'white', fontWeight: '500' }}>
                      {team.name}
                    </td>
                    {sortedWeeks.map((week) => {
                      const weekPoints = teamScores.get(week.id) || 0;
                      totalPoints += weekPoints;
                      return (
                        <td key={week.id} style={{ padding: '0.75rem', textAlign: 'center', color: weekPoints > 0 ? '#28a745' : '#666' }}>
                          {weekPoints > 0 ? weekPoints.toFixed(1) : '—'}
                        </td>
                      );
                    })}
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', background: '#e7f3ff' }}>
                      {totalPoints.toFixed(1)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#999', fontStyle: 'italic' }}>
        Scores are calculated automatically when player stats are entered
      </p>
    </Card>
  );
}

