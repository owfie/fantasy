'use client';

import { Card } from '@/components/Card';
import { useUserProfiles, useSetUserAdmin } from '@/lib/queries/fantasy-teams-test.queries';

interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  is_admin: boolean;
  created_at?: string;
}

export default function UsersListClient() {
  const { data: users = [], isLoading, error } = useUserProfiles();
  const setAdminMutation = useSetUserAdmin();

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    const action = currentIsAdmin ? 'remove admin privileges from' : 'make admin';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    
    await setAdminMutation.mutateAsync({ userId, isAdmin: !currentIsAdmin });
  };

  if (isLoading) {
    return (
      <div>
        <h3>👤 Users</h3>
        <p>Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h3>👤 Users</h3>
        <div style={{ padding: '1rem', background: '#f8d7da', borderRadius: '4px', color: '#721c24' }}>
          <strong>Error loading users:</strong> {error instanceof Error ? error.message : 'Unknown error'}
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
          This might be an RLS policy issue. Make sure user_profiles table has a SELECT policy.
        </p>
      </div>
    );
  }

  const typedUsers = users as UserProfile[];

  return (
    <div>
      <h3>Users ({typedUsers.length})</h3>
      <br />

      {typedUsers.length === 0 ? (
        <div style={{ padding: '1rem', background: '#fff3cd', borderRadius: '4px' }}>
          <strong>No users found.</strong>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            User profiles are created when users sign in. The admin user should exist from the migration.
            Check if the <code>user_profiles</code> table has the correct RLS policies for SELECT.
          </p>
        </div>
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                  <th style={{ padding: '0.6rem', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '0.6rem', textAlign: 'left' }}>Display Name</th>
                  <th style={{ padding: '0.6rem', textAlign: 'center' }}>Role</th>
                  <th style={{ padding: '0.6rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {typedUsers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '0.6rem' }}>
                      <div>{user.email}</div>
                      <div style={{ fontSize: '0.75rem', color: '#999', fontFamily: 'monospace' }}>
                        {user.id.substring(0, 8)}...
                      </div>
                    </td>
                    <td style={{ padding: '0.6rem' }}>{user.display_name || '—'}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                      {user.is_admin ? (
                        <span style={{ 
                          background: '#007bff', 
                          color: 'white', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          Admin
                        </span>
                      ) : (
                        <span style={{ 
                          background: '#e9ecef', 
                          color: '#666', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem' 
                        }}>
                          User
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                        disabled={setAdminMutation.isPending}
                        style={{
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: setAdminMutation.isPending ? 'not-allowed' : 'pointer',
                          background: user.is_admin ? '#ffc107' : '#28a745',
                          color: user.is_admin ? '#212529' : 'white',
                          opacity: setAdminMutation.isPending ? 0.6 : 1,
                          transition: 'all 0.15s ease',
                        }}
                        onMouseOver={(e) => {
                          if (!setAdminMutation.isPending) {
                            e.currentTarget.style.opacity = '0.85';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!setAdminMutation.isPending) {
                            e.currentTarget.style.opacity = '1';
                          }
                        }}
                      >
                        {setAdminMutation.isPending ? '...' : user.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

