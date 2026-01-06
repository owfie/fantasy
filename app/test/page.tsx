/**
 * Comprehensive test page for Unit of Work and domain functionality
 * Tests all features based on REQUIREMENTS.md
 * Now uses TanStack Query for data fetching
 */

'use client';

import { useTestDashboard } from '@/lib/queries/test.queries';

import TestClient from './test-client';
import TeamsCrudClient from './teams-crud-client';
import PlayersCrudClient from './players-crud-client';
import AdminDashboard from './admin-dashboard';

export default function TestPage() {
  const { data: dashboardData, isLoading, error } = useTestDashboard();

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>🧪 Super League Fantasy - Test Suite</h1>
        <div style={{ marginBottom: '2rem', padding: '1rem', background: '#fff3cd', borderRadius: '4px' }}>
          <strong>Loading...</strong>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>🧪 Super League Fantasy - Test Suite</h1>
        <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8d7da', borderRadius: '4px' }}>
          <strong>Database Status:</strong> ❌ Error
          <div style={{ marginTop: '0.5rem', color: '#721c24' }}>
            <strong>Error:</strong> {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </div>
      </div>
    );
  }

  const status = dashboardData ? '✅ Connected!' : '❌ Error';
  const teams = dashboardData?.teams || [];
  const players = dashboardData?.players || [];
  const weeks = dashboardData?.weeks || [];
  const playerPoints = dashboardData?.playerPoints || [];
  const testData = dashboardData?.testData || {};

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 Super League Fantasy - Test Suite</h1>
      
      {/* Connection Status */}
      <div style={{ marginBottom: '2rem', padding: '1rem', background: status.includes('✅') ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>
        <strong>Database Status:</strong> {status}
      </div>

      {/* Data Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        {teams.length > 0 && (
          <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
            <h2>Teams ({teams.length})</h2>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              {teams.slice(0, 5).map((team: any) => (
                <li key={team.id}>
                  {team.name} {team.color && <span style={{ color: team.color }}>●</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {players.length > 0 && (
          <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
            <h2>Players ({players.length})</h2>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              {players.slice(0, 5).map((player: any) => (
                <li key={player.id}>
                  {player.first_name} {player.last_name} 
                  {player.starting_value && ` ($${player.starting_value})`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Admin Dashboard */}
      {status.includes('✅') && (
        <div style={{ marginTop: '2rem' }}>
          <AdminDashboard />
        </div>
      )}

      {/* Teams CRUD Operations */}
      {status.includes('✅') && (
        <div style={{ marginTop: '2rem' }}>
          <TeamsCrudClient />
        </div>
      )}

      {/* Players CRUD Operations */}
      {status.includes('✅') && (
        <div style={{ marginTop: '2rem' }}>
          <PlayersCrudClient />
        </div>
      )}

      {/* Interactive Tests */}
      {status.includes('✅') && Object.keys(testData).length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>🧪 Interactive Tests</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Test all Unit of Work functionality and domain services
          </p>
          
          <TestClient testData={testData} />
        </div>
      )}

      {/* Requirements Checklist */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e7f3ff', borderRadius: '4px' }}>
        <h3>✅ Requirements Coverage</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>✅ Players with starting values</li>
          <li>✅ Player stats (goals, assists, D's, drops, turnovers)</li>
          <li>✅ Points calculation formula</li>
          <li>✅ Fantasy teams with salary cap (team value)</li>
          <li>✅ Captain selection (double points)</li>
          <li>✅ Add/remove players from teams</li>
          <li>✅ Transaction support (Unit of Work)</li>
          <li>⏳ Trades (up to 2 per week) - Coming soon</li>
          <li>⏳ Value appreciation/depreciation - Coming soon</li>
          <li>⏳ Bracket playoff - Coming soon</li>
        </ul>
      </div>

      {/* Player Points Table */}
      <div style={{ marginTop: '2rem' }}>
        <h2>📊 Player Points by Week</h2>
        
        {weeks.length === 0 && (
          <div style={{ padding: '1rem', background: '#fff3cd', borderRadius: '4px', marginTop: '1rem' }}>
            <p>No weeks found. Create a season and weeks first using the interactive tests above.</p>
          </div>
        )}

        {weeks.length > 0 && playerPoints.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <thead>
                <tr style={{ background: '#f8f9fa', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '2px solid #dee2e6',
                      fontWeight: 'bold',
                      position: 'sticky',
                      left: 0,
                      background: '#f8f9fa',
                      zIndex: 11,
                      minWidth: '200px',
                    }}
                  >
                    Player
                  </th>
                  {weeks.map((week) => (
                    <th
                      key={week.id}
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        borderBottom: '2px solid #dee2e6',
                        fontWeight: 'bold',
                        minWidth: '100px',
                      }}
                    >
                      {week.name || `Week ${week.week_number}`}
                    </th>
                  ))}
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'center',
                      borderBottom: '2px solid #dee2e6',
                      fontWeight: 'bold',
                      background: '#e7f3ff',
                      minWidth: '100px',
                    }}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {playerPoints.map((player, index) => (
                  <tr
                    key={player.playerId}
                    style={{
                      background: index % 2 === 0 ? 'white' : '#f8f9fa',
                    }}
                  >
                    <td
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #dee2e6',
                        position: 'sticky',
                        left: 0,
                        background: index % 2 === 0 ? 'white' : '#f8f9fa',
                        zIndex: 1,
                        fontWeight: '500',
                      }}
                    >
                      <div>
                        <div>{player.playerName}</div>
                        {player.teamName && (
                          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                            {player.teamName}
                          </div>
                        )}
                      </div>
                    </td>
                    {weeks.map((week) => {
                      const points = player.weekPoints[week.id] || 0;
                      return (
                        <td
                          key={week.id}
                          style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'center',
                            borderBottom: '1px solid #dee2e6',
                            color: points > 0 ? '#28a745' : points < 0 ? '#dc3545' : '#666',
                            fontWeight: points !== 0 ? '600' : '400',
                          }}
                        >
                          {points !== 0 ? points : '-'}
                        </td>
                      );
                    })}
                    <td
                      style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'center',
                        borderBottom: '1px solid #dee2e6',
                        fontWeight: 'bold',
                        background: '#e7f3ff',
                        color: player.totalPoints > 0 ? '#28a745' : player.totalPoints < 0 ? '#dc3545' : '#666',
                      }}
                    >
                      {player.totalPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                  <td
                    style={{
                      padding: '1rem',
                      borderTop: '2px solid #dee2e6',
                      position: 'sticky',
                      left: 0,
                      background: '#f8f9fa',
                      zIndex: 11,
                    }}
                  >
                    Week Totals
                  </td>
                  {weeks.map((week) => {
                    const weekTotal = playerPoints.reduce(
                      (sum, player) => sum + (player.weekPoints[week.id] || 0),
                      0
                    );
                    return (
                      <td
                        key={week.id}
                        style={{
                          padding: '1rem',
                          textAlign: 'center',
                          borderTop: '2px solid #dee2e6',
                        }}
                      >
                        {weekTotal}
                      </td>
                    );
                  })}
                  <td
                    style={{
                      padding: '1rem',
                      textAlign: 'center',
                      borderTop: '2px solid #dee2e6',
                      background: '#e7f3ff',
                    }}
                  >
                    {playerPoints.reduce((sum, player) => sum + player.totalPoints, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {playerPoints.length === 0 && weeks.length > 0 && (
          <div style={{ padding: '1rem', background: '#fff3cd', borderRadius: '4px', marginTop: '1rem' }}>
            <p>No player stats found. Add player stats using the interactive tests above to see points.</p>
          </div>
        )}

        <div style={{ marginTop: '1rem', padding: '1rem', background: '#e7f3ff', borderRadius: '4px' }}>
          <h3 style={{ marginTop: 0 }}>Points Calculation</h3>
          <p style={{ margin: '0.5rem 0' }}>
            Points = Goals + (Assists × 2) + (Blocks × 3) - Drops - Throwaways
          </p>
          <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
            Negative points are shown in red, positive in green.
          </p>
        </div>
      </div>
    </div>
  );
}
