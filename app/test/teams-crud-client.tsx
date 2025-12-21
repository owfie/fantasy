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
import { testGetTeam, testGetAllTeams } from '@/lib/api';

// Helper function to format date consistently (avoids hydration errors)
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  // Use a consistent format: YYYY-MM-DD HH:MM:SS
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export default function TeamsCrudClient() {
  const { data: teams = [], isLoading: isLoadingTeams, error: teamsError } = useTeamsIncludingDeleted();
  
  // Mutations
  const createTeamMutation = useTestCreateTeam();
  const updateTeamMutation = useTestUpdateTeam();
  const softDeleteMutation = useTestSoftDeleteTeam();
  const hardDeleteMutation = useTestHardDeleteTeam();
  const restoreMutation = useTestRestoreTeam();
  
  // Local state for test results and form data
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    createName: '',
    createColor: '',
    updateId: '',
    updateName: '',
    updateColor: '',
    deleteId: '',
    getById: '',
  });

  const runTest = async (testName: string, testFn: () => Promise<TestResult>) => {
    setLoading((prev) => ({ ...prev, [testName]: true }));
    try {
      const result = await testFn();
      setResults((prev) => ({ ...prev, [testName]: result }));
    } catch (error: any) {
      setResults((prev) => ({
        ...prev,
        [testName]: {
          success: false,
          message: 'Test failed',
          error: error.message,
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
    } catch (error: any) {
      setResults((prev) => ({
        ...prev,
        create: {
          success: false,
          message: error.message || 'Failed to create team',
          error: error.message,
        },
      }));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await updateTeamMutation.mutateAsync({
        teamId: formData.updateId,
        updates: {
          name: formData.updateName || undefined,
          color: formData.updateColor || undefined,
        },
      });
      setResults((prev) => ({ ...prev, update: result }));
    } catch (error: any) {
      setResults((prev) => ({
        ...prev,
        update: {
          success: false,
          message: error.message || 'Failed to update team',
          error: error.message,
        },
      }));
    }
  };

  const handleSoftDelete = async (teamId: string) => {
    if (!confirm('Are you sure you want to soft delete this team?')) return;
    try {
      const result = await softDeleteMutation.mutateAsync(teamId);
      setResults((prev) => ({ ...prev, softDelete: result }));
    } catch (error: any) {
      setResults((prev) => ({
        ...prev,
        softDelete: {
          success: false,
          message: error.message || 'Failed to soft delete team',
          error: error.message,
        },
      }));
    }
  };

  const handleHardDelete = async (teamId: string) => {
    if (!confirm('⚠️ WARNING: This will permanently delete the team. Are you sure?')) return;
    try {
      const result = await hardDeleteMutation.mutateAsync(teamId);
      setResults((prev) => ({ ...prev, hardDelete: result }));
    } catch (error: any) {
      setResults((prev) => ({
        ...prev,
        hardDelete: {
          success: false,
          message: error.message || 'Failed to hard delete team',
          error: error.message,
        },
      }));
    }
  };

  const handleRestore = async (teamId: string) => {
    try {
      const result = await restoreMutation.mutateAsync(teamId);
      setResults((prev) => ({ ...prev, restore: result }));
    } catch (error: any) {
      setResults((prev) => ({
        ...prev,
        restore: {
          success: false,
          message: error.message || 'Failed to restore team',
          error: error.message,
        },
      }));
    }
  };

  const TestResultDisplay = ({ testName, label }: { testName: string; label: string }) => {
    const result = results[testName];
    const isLoading = loading[testName] || 
      (testName === 'create' && createTeamMutation.isPending) ||
      (testName === 'update' && updateTeamMutation.isPending) ||
      (testName === 'softDelete' && softDeleteMutation.isPending) ||
      (testName === 'hardDelete' && hardDeleteMutation.isPending) ||
      (testName === 'restore' && restoreMutation.isPending);

    if (!result && !isLoading) return null;

    return (
      <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: result?.success ? '#d4edda' : '#f8d7da', borderRadius: '4px', fontSize: '0.9rem' }}>
        {isLoading ? (
          <div>Running...</div>
        ) : (
          <>
            <div><strong>{result?.success ? '✅' : '❌'}</strong> {result?.message}</div>
            {result?.error && <div style={{ color: '#721c24', marginTop: '0.25rem' }}>{result.error}</div>}
            {result?.data && (
              <details style={{ marginTop: '0.5rem' }}>
                <summary style={{ cursor: 'pointer', color: '#007bff' }}>View Data</summary>
                <pre style={{ marginTop: '0.5rem', fontSize: '0.8rem', overflow: 'auto' }}>
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            )}
          </>
        )}
      </div>
    );
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

  return (
    <div>
      <h3>🏈 Teams CRUD Operations</h3>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Test Create, Read, Update, Delete (Soft), and Delete (Hard) operations for teams
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column: Forms */}
        <div>
          {/* Create Team */}
          <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
            <h4>Create Team</h4>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.createName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, createName: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
                  Color (hex)
                </label>
                <input
                  type="text"
                  value={formData.createColor}
                  onChange={(e) => setFormData((prev) => ({ ...prev, createColor: e.target.value }))}
                  placeholder="#FF5733"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <button
                type="submit"
                disabled={createTeamMutation.isPending}
                style={{
                  padding: '0.5rem 1rem',
                  background: createTeamMutation.isPending ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: createTeamMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
              </button>
              <TestResultDisplay testName="create" label="Create" />
            </form>
          </div>

          {/* Update Team */}
          <div data-update-form style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
            <h4>Update Team</h4>
            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
                  Team ID *
                </label>
                <input
                  type="text"
                  value={formData.updateId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, updateId: e.target.value }))}
                  required
                  placeholder="Enter team UUID"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
                  New Name
                </label>
                <input
                  type="text"
                  value={formData.updateName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, updateName: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
                  New Color
                </label>
                <input
                  type="text"
                  value={formData.updateColor}
                  onChange={(e) => setFormData((prev) => ({ ...prev, updateColor: e.target.value }))}
                  placeholder="#FF5733"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <button
                type="submit"
                disabled={updateTeamMutation.isPending}
                style={{
                  padding: '0.5rem 1rem',
                  background: updateTeamMutation.isPending ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: updateTeamMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {updateTeamMutation.isPending ? 'Updating...' : 'Update Team'}
              </button>
              <TestResultDisplay testName="update" label="Update" />
            </form>
          </div>

          {/* Get Team by ID */}
          <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
            <h4>Get Team by ID</h4>
            <div style={{ marginBottom: '0.75rem' }}>
              <input
                type="text"
                value={formData.getById}
                onChange={(e) => setFormData((prev) => ({ ...prev, getById: e.target.value }))}
                placeholder="Enter team UUID"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '0.5rem' }}
              />
              <button
                onClick={() => runTest('getById', () => testGetTeam(formData.getById))}
                disabled={loading.getById || !formData.getById}
                style={{
                  padding: '0.5rem 1rem',
                  background: loading.getById || !formData.getById ? '#ccc' : '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading.getById || !formData.getById ? 'not-allowed' : 'pointer',
                }}
              >
                {loading.getById ? 'Loading...' : 'Get Team'}
              </button>
            </div>
            <TestResultDisplay testName="getById" label="Get by ID" />
          </div>
        </div>

        {/* Right Column: Teams List */}
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>Teams ({teams.length})</h4>
            <button
              onClick={() => runTest('getAll', () => testGetAllTeams())}
              disabled={loading.getAll}
              style={{
                padding: '0.5rem 1rem',
                background: loading.getAll ? '#ccc' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading.getAll ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {loading.getAll ? 'Loading...' : 'Refresh'}
            </button>
          </div>
            <TestResultDisplay testName="getAll" label="Get All" />
            <TestResultDisplay testName="restore" label="Restore" />

          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {teams.map((team) => {
              const isDeleted = !!team.deleted_at;
              return (
                <div
                  key={team.id}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    background: isDeleted ? '#f8f9fa' : 'white',
                    border: `1px solid ${isDeleted ? '#dee2e6' : '#dee2e6'}`,
                    borderRadius: '4px',
                    opacity: isDeleted ? 0.7 : 1,
                  }}
                >
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
                        <button
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              updateId: team.id,
                              updateName: team.name,
                              updateColor: team.color || '',
                            }));
                            document.querySelector('[data-update-form]')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleSoftDelete(team.id)}
                          disabled={softDeleteMutation.isPending}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#ffc107',
                            color: 'black',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: softDeleteMutation.isPending ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          Soft Delete
                        </button>
                        <button
                          onClick={() => handleHardDelete(team.id)}
                          disabled={hardDeleteMutation.isPending}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: hardDeleteMutation.isPending ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          Hard Delete
                        </button>
                      </>
                    )}
                    {isDeleted && (
                      <button
                        onClick={() => handleRestore(team.id)}
                        disabled={restoreMutation.isPending}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: restoreMutation.isPending ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        {restoreMutation.isPending ? 'Restoring...' : 'Restore'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e7f3ff', borderRadius: '4px' }}>
        <h4>📋 SOLID Principles Applied</h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
          <li><strong>Single Responsibility:</strong> Each service method has one clear purpose</li>
          <li><strong>Open/Closed:</strong> BaseCrudService can be extended without modification</li>
          <li><strong>Liskov Substitution:</strong> TeamsService can be used anywhere BaseCrudService is expected</li>
          <li><strong>Interface Segregation:</strong> IBaseCrudService provides focused interface</li>
          <li><strong>Dependency Inversion:</strong> Services depend on UnitOfWork abstraction, not concrete implementations</li>
        </ul>
      </div>
    </div>
  );
}
