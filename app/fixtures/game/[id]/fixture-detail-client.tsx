'use client';

import { useUpdateFixture } from '@/lib/queries';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GameWithDetails } from '@/lib/domain/repositories/games.repository';
import { formatInACST } from '@/lib/utils/date-utils';

interface FixtureDetailClientProps {
  fixture: GameWithDetails;
}

export default function FixtureDetailClient({ fixture: initialFixture }: FixtureDetailClientProps) {
  const updateFixture = useUpdateFixture();
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingBroadcastLink, setEditingBroadcastLink] = useState(false);
  const [broadcastLinkValue, setBroadcastLinkValue] = useState(initialFixture.broadcast_link || '');
  const [fixture, setFixture] = useState(initialFixture);

  // Update fixture when mutation succeeds
  useEffect(() => {
    if (updateFixture.isSuccess && updateFixture.data) {
      // The mutation returns GameWithTeams, but we need to keep the details
      // For now, just update the broadcast_link if it changed
      setFixture(prev => ({
        ...prev,
        broadcast_link: updateFixture.data.broadcast_link,
      }));
    }
  }, [updateFixture.isSuccess, updateFixture.data]);

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        setIsAdmin(profile?.is_admin || false);
      }
    }
    checkAdmin();
  }, []);

  useEffect(() => {
    setBroadcastLinkValue(fixture.broadcast_link || '');
  }, [fixture.broadcast_link]);

  const handleSaveBroadcastLink = async () => {
    await updateFixture.mutateAsync({
      id: fixture.id,
      broadcast_link: broadcastLinkValue || undefined,
    });
    setEditingBroadcastLink(false);
  };

  const formatAvailabilityStatus = (status?: string) => {
    if (!status) return 'unknown';
    return status;
  };

  const getAvailabilityDisplay = (status?: string) => {
    switch (status) {
      case 'available':
        return { text: 'Available', color: 'green' };
      case 'unavailable':
        return { text: 'Unavailable', color: 'red' };
      case 'unsure':
        return { text: 'Unsure', color: 'orange' };
      default:
        return { text: 'Unknown', color: 'gray' };
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
          {fixture.home_team.name} vs {fixture.away_team.name}
        </h1>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <strong>Scheduled Time:</strong>{' '}
        {fixture.scheduled_time 
          ? formatInACST(fixture.scheduled_time, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
          : 'TBD'
        }
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <strong>Broadcast Link:</strong>
        {isAdmin ? (
          <div style={{ marginTop: '0.5rem' }}>
            {editingBroadcastLink ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={broadcastLinkValue}
                  onChange={(e) => setBroadcastLinkValue(e.target.value)}
                  placeholder="Enter broadcast URL"
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button
                  onClick={handleSaveBroadcastLink}
                  disabled={updateFixture.isPending}
                  style={{ padding: '0.5rem 1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {updateFixture.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingBroadcastLink(false);
                    setBroadcastLinkValue(fixture.broadcast_link || '');
                  }}
                  style={{ padding: '0.5rem 1rem', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {fixture.broadcast_link ? (
                  <a 
                    href={fixture.broadcast_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#007bff', textDecoration: 'underline' }}
                  >
                    {fixture.broadcast_link}
                  </a>
                ) : (
                  <span style={{ color: '#999' }}>No broadcast link set</span>
                )}
                <button
                  onClick={() => setEditingBroadcastLink(true)}
                  style={{ padding: '0.25rem 0.5rem', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: '0.5rem' }}>
            {fixture.broadcast_link ? (
              <a 
                href={fixture.broadcast_link} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#007bff', textDecoration: 'underline' }}
              >
                {fixture.broadcast_link}
              </a>
            ) : (
              <span style={{ color: '#999' }}>No broadcast link available</span>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Player Availability</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Home Team */}
          <div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
              {fixture.home_team.name}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {fixture.home_team_players.length > 0 ? (
                fixture.home_team_players.map(player => {
                  const availability = player.availability;
                  const status = formatAvailabilityStatus(availability?.status);
                  const display = getAvailabilityDisplay(status);
                  return (
                    <div 
                      key={player.id} 
                      style={{ 
                        padding: '0.5rem', 
                        border: '1px solid #ddd', 
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>
                          {player.first_name} {player.last_name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#666' }}>
                          {player.player_role}
                        </div>
                      </div>
                      <div style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px',
                        backgroundColor: display.color === 'green' ? '#d4edda' : 
                                        display.color === 'red' ? '#f8d7da' :
                                        display.color === 'orange' ? '#fff3cd' : '#e9ecef',
                        color: display.color === 'green' ? '#155724' :
                               display.color === 'red' ? '#721c24' :
                               display.color === 'orange' ? '#856404' : '#495057',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {display.text}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: '#999' }}>No players found</p>
              )}
            </div>
          </div>

          {/* Away Team */}
          <div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
              {fixture.away_team.name}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {fixture.away_team_players.length > 0 ? (
                fixture.away_team_players.map(player => {
                  const availability = player.availability;
                  const status = formatAvailabilityStatus(availability?.status);
                  const display = getAvailabilityDisplay(status);
                  return (
                    <div 
                      key={player.id} 
                      style={{ 
                        padding: '0.5rem', 
                        border: '1px solid #ddd', 
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>
                          {player.first_name} {player.last_name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#666' }}>
                          {player.player_role}
                        </div>
                      </div>
                      <div style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px',
                        backgroundColor: display.color === 'green' ? '#d4edda' : 
                                        display.color === 'red' ? '#f8d7da' :
                                        display.color === 'orange' ? '#fff3cd' : '#e9ecef',
                        color: display.color === 'green' ? '#155724' :
                               display.color === 'red' ? '#721c24' :
                               display.color === 'orange' ? '#856404' : '#495057',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {display.text}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: '#999' }}>No players found</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

