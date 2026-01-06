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
import {
  TestResultDisplay,
  FormField,
  FormInput,
  FormSection,
  Button,
  formatDate,
} from './shared/crud-components';

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
      <h3>Teams</h3>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Test Create, Read, Update, Delete (Soft), and Delete (Hard) operations for teams
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column: Forms */}image.pngimage.pngimage.pngimage.pngimage.pngimage.pngimage.pngimage.pngimage.png
        <div>
          {/* Create Team */}
          <FormSection title="Create Team">
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
              <Button
                type="submit"
                variant="success"
                isLoading={createTeamMutation.isPending}
              >
                Create Team
              </Button>
              <TestResultDisplay
                testName="create"
                isLoading={createTeamMutation.isPending}
                result={results.create}
              />
            </form>
          </FormSection>

          {/* Update Team */}
          <FormSection title="Update Team">
            <div data-update-form>
              <form onSubmit={handleUpdate}>
                <FormField label="Team ID" required>
                  <FormInput
                    value={formData.updateId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, updateId: e.target.value }))}
                    placeholder="Enter team UUID"
                    required
                  />
                </FormField>
                <FormField label="New Name">
                  <FormInput
                    value={formData.updateName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, updateName: e.target.value }))}
                  />
                </FormField>
                <FormField label="New Color">
                  <FormInput
                    value={formData.updateColor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, updateColor: e.target.value }))}
                    placeholder="#FF5733"
                  />
                </FormField>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={updateTeamMutation.isPending}
                >
                  Update Team
                </Button>
                <TestResultDisplay
                  testName="update"
                  isLoading={updateTeamMutation.isPending}
                  result={results.update}
                />
              </form>
            </div>
          </FormSection>

          {/* Get Team by ID */}
          <FormSection title="Get Team by ID">
            <div style={{ marginBottom: '0.75rem' }}>
              <FormInput
                value={formData.getById}
                onChange={(e) => setFormData((prev) => ({ ...prev, getById: e.target.value }))}
                placeholder="Enter team UUID"
                style={{ marginBottom: '0.5rem' }}
              />
              <Button
                onClick={() => runTest('getById', () => testGetTeam(formData.getById))}
                disabled={loading.getById || !formData.getById}
                variant="info"
              >
                Get Team
              </Button>
            </div>
            <TestResultDisplay
              testName="getById"
              isLoading={loading.getById}
              result={results.getById}
            />
          </FormSection>
        </div>

        {/* Right Column: Teams List */}
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
                        <Button
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              updateId: team.id,
                              updateName: team.name,
                              updateColor: team.color || '',
                            }));
                            document.querySelector('[data-update-form]')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          variant="primary"
                          style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleSoftDelete(team.id)}
                          disabled={softDeleteMutation.isPending}
                          variant="warning"
                          style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                        >
                          Soft Delete
                        </Button>
                        <Button
                          onClick={() => handleHardDelete(team.id)}
                          disabled={hardDeleteMutation.isPending}
                          variant="danger"
                          style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                        >
                          Hard Delete
                        </Button>
                      </>
                    )}
                    {isDeleted && (
                      <Button
                        onClick={() => handleRestore(team.id)}
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
