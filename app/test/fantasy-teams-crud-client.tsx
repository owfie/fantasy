'use client';

import { useState } from 'react';
import {
  useUserProfiles,
  useActiveSeason,
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
import {
  TestResultDisplay,
  FormField,
  FormInput,
  FormSelect,
  Button,
  FormSection,
  formatDate,
} from './shared/crud-components';
import { getErrorMessage } from '@/lib/utils';
import { Player, FantasyTeam } from '@/lib/domain/types';

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

export default function FantasyTeamsCrudClient() {
  // Data queries
  const { data: users = [], isLoading: isLoadingUsers, error: usersError } = useUserProfiles();
  const { data: activeSeason, isLoading: isLoadingSeason } = useActiveSeason();
  const { data: fantasyTeams = [], isLoading: isLoadingTeams, error: teamsError } = useFantasyTeams();
  
  // Selected team for editing
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const { data: selectedTeamData, isLoading: isLoadingSelectedTeam } = useFantasyTeamWithPlayers(selectedTeamId);
  const { data: availablePlayers = [] } = useAvailablePlayers(activeSeason?.id || null);
  
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
  const [formData, setFormData] = useState({
    createName: '',
    createOwnerId: '',
    updateName: '',
    addPlayerId: '',
    addAsBench: false,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeason) {
      setResults(prev => ({
        ...prev,
        create: { success: false, message: 'No active season available', error: 'Create a season first' }
      }));
      return;
    }
    
    try {
      const result = await createMutation.mutateAsync({
        ownerId: formData.createOwnerId,
        seasonId: activeSeason.id,
        name: formData.createName,
      });
      setResults(prev => ({ ...prev, create: result }));
      if (result.success) {
        setFormData(prev => ({ ...prev, createName: '', createOwnerId: '' }));
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

  if (isLoadingTeams || isLoadingSeason || isLoadingUsers) {
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
      <h3>Fantasy Teams</h3>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Create and manage fantasy teams, add/remove players, set captains and bench players
      </p>

      {/* Season Status */}
      <div style={{ 
        marginBottom: '1.5rem', 
        padding: '0.75rem', 
        background: activeSeason ? '#d4edda' : '#f8d7da', 
        borderRadius: '4px',
        fontSize: '0.9rem'
      }}>
        {activeSeason ? (
          <>
            <strong>Active Season:</strong> {activeSeason.name} ({activeSeason.start_date} - {activeSeason.end_date})
          </>
        ) : (
          <>
            <strong>⚠️ No Active Season:</strong> Create a season using the Interactive Tests below before creating fantasy teams.
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column: Create & Edit Forms */}
        <div>
          {/* Create Fantasy Team */}
          <FormSection title="Create Fantasy Team">
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
              <Button
                type="submit"
                variant="success"
                isLoading={createMutation.isPending}
                disabled={!activeSeason}
              >
                Create Team
              </Button>
              <TestResultDisplay testName="create" isLoading={createMutation.isPending} result={results.create} />
            </form>
          </FormSection>

          {/* Edit Selected Team */}
          {selectedTeamId && selectedTeamData && (
            <FormSection title={`Edit: ${selectedTeamData.team.name}`}>
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
                    Update Name
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedTeamId(null)}
                  >
                    Deselect
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
                          label: `${p.first_name} ${p.last_name} ($${p.starting_value})` 
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

              {/* Team Roster */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #dee2e6' }}>
                <h5 style={{ marginBottom: '0.75rem' }}>
                  Roster ({selectedTeamData.playerCount} players)
                </h5>
                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem' }}>
                  Active: {selectedTeamData.activePlayers} | Bench: {selectedTeamData.benchPlayers} | 
                  Value: ${selectedTeamData.team.total_value?.toFixed(2) || '0.00'}
                </div>
                
                {isLoadingSelectedTeam ? (
                  <p>Loading roster...</p>
                ) : (selectedTeamData.players as FantasyTeamPlayer[]).length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>No players on this team yet</p>
                ) : (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {(selectedTeamData.players as FantasyTeamPlayer[]).map((tp) => (
                      <div
                        key={tp.id}
                        style={{
                          padding: '0.5rem',
                          marginBottom: '0.25rem',
                          background: tp.is_reserve ? '#fff3cd' : 'white',
                          border: tp.is_captain ? '2px solid #007bff' : '1px solid #dee2e6',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: tp.is_captain ? 'bold' : 'normal' }}>
                            {tp.players?.first_name} {tp.players?.last_name}
                          </span>
                          {tp.is_captain && <span style={{ color: '#007bff', marginLeft: '0.5rem' }}>👑 Captain</span>}
                          {tp.is_reserve && <span style={{ color: '#856404', marginLeft: '0.5rem' }}>🪑 Bench</span>}
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                            ${tp.players?.starting_value} • {tp.players?.player_role}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {!tp.is_captain && (
                            <Button
                              variant="primary"
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
                )}
                <TestResultDisplay testName="removePlayer" isLoading={removePlayerMutation.isPending} result={results.removePlayer} />
                <TestResultDisplay testName="setCaptain" isLoading={setCaptainMutation.isPending} result={results.setCaptain} />
                <TestResultDisplay testName="toggleBench" isLoading={setBenchMutation.isPending} result={results.toggleBench} />
              </div>
            </FormSection>
          )}
        </div>

        {/* Right Column: Teams List */}
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>Fantasy Teams ({typedFantasyTeams.length})</h4>
          </div>
          <TestResultDisplay testName="delete" isLoading={deleteMutation.isPending} result={results.delete} />

          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {typedFantasyTeams.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
                No fantasy teams yet. Create one using the form.
              </p>
            ) : (
              typedFantasyTeams.map((team) => {
                const isSelected = selectedTeamId === team.id;
                return (
                  <div
                    key={team.id}
                    style={{
                      padding: '1rem',
                      marginBottom: '0.5rem',
                      background: isSelected ? '#e7f3ff' : 'white',
                      border: isSelected ? '2px solid #007bff' : '1px solid #dee2e6',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setSelectedTeamId(isSelected ? null : team.id);
                      if (!isSelected) {
                        setFormData(prev => ({ ...prev, updateName: team.name }));
                      }
                    }}
                  >
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
                        variant={isSelected ? 'secondary' : 'primary'}
                        style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => {
                          setSelectedTeamId(isSelected ? null : team.id);
                          if (!isSelected) {
                            setFormData(prev => ({ ...prev, updateName: team.name }));
                          }
                        }}
                      >
                        {isSelected ? 'Deselect' : 'Edit'}
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
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

