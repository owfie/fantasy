'use client';

import { Card } from '@/components/Card';
import { useFantasyTeamAnalytics } from '@/lib/queries/fantasy-analytics.queries';

interface FantasyAnalyticsTableProps {
  seasonId?: string;
}

/**
 * Format a number as currency (in thousands)
 */
function formatValue(value: number | null): string {
  if (value === null) return '—';
  return `$${value}k`;
}

/**
 * Format a delta with + or - sign
 */
function formatDelta(delta: number | null): string {
  if (delta === null) return '—';
  const sign = delta >= 0 ? '+' : '';
  return `${sign}$${delta}k`;
}

/**
 * Get color for delta value (green for positive, red for negative)
 */
function getDeltaColor(delta: number | null): string {
  if (delta === null) return '#666';
  if (delta > 0) return '#28a745';
  if (delta < 0) return '#dc3545';
  return '#666';
}

export default function FantasyAnalyticsTable({ seasonId }: FantasyAnalyticsTableProps) {
  const { data, isLoading, error } = useFantasyTeamAnalytics(seasonId || null);

  if (!seasonId) {
    return (
      <Card>
        <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Fantasy Team Analytics</h4>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
          Select a season to view analytics
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Fantasy Team Analytics</h4>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
          Loading...
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Fantasy Team Analytics</h4>
        <p style={{ color: '#dc3545', fontSize: '0.9rem', margin: 0 }}>
          Error: {error.message}
        </p>
      </Card>
    );
  }

  if (!data || data.teams.length === 0) {
    return (
      <Card>
        <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Fantasy Team Analytics</h4>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
          No fantasy teams found for this season
        </p>
      </Card>
    );
  }

  const { teams, weekNumbers } = data;

  // Sort teams by total points (descending)
  const sortedTeams = [...teams].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <Card>
      <h4 style={{ margin: 0, marginBottom: '1rem' }}>Fantasy Team Analytics</h4>
      <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '1rem', marginTop: 0 }}>
        Points scored, team value, remaining budget, and week-over-week budget changes
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            {/* Main header row */}
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
              <th
                rowSpan={2}
                style={{
                  padding: '0.5rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  position: 'sticky',
                  left: 0,
                  background: '#f8f9fa',
                  zIndex: 2,
                  borderRight: '2px solid #dee2e6',
                  minWidth: '120px'
                }}
              >
                Team
              </th>
              <th
                rowSpan={2}
                style={{
                  padding: '0.5rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  background: '#f8f9fa',
                  borderRight: '2px solid #dee2e6',
                  minWidth: '80px'
                }}
              >
                Owner
              </th>
              {weekNumbers.map((weekNum) => (
                <th
                  key={weekNum}
                  colSpan={4}
                  style={{
                    padding: '0.5rem',
                    textAlign: 'center',
                    fontWeight: '600',
                    borderRight: '1px solid #dee2e6',
                    background: weekNum % 2 === 0 ? '#f0f0f0' : '#f8f9fa'
                  }}
                >
                  Week {weekNum}
                </th>
              ))}
              <th
                rowSpan={2}
                style={{
                  padding: '0.5rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  background: '#e7f3ff',
                  minWidth: '60px'
                }}
              >
                Total Pts
              </th>
            </tr>
            {/* Sub-header row for week columns */}
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              {weekNumbers.map((weekNum) => (
                <>
                  <th
                    key={`${weekNum}-pts`}
                    style={{
                      padding: '0.4rem',
                      textAlign: 'center',
                      fontWeight: '500',
                      fontSize: '0.7rem',
                      color: '#666',
                      background: weekNum % 2 === 0 ? '#f0f0f0' : '#f8f9fa'
                    }}
                  >
                    Pts
                  </th>
                  <th
                    key={`${weekNum}-value`}
                    style={{
                      padding: '0.4rem',
                      textAlign: 'center',
                      fontWeight: '500',
                      fontSize: '0.7rem',
                      color: '#666',
                      background: weekNum % 2 === 0 ? '#f0f0f0' : '#f8f9fa'
                    }}
                  >
                    Value
                  </th>
                  <th
                    key={`${weekNum}-budget`}
                    style={{
                      padding: '0.4rem',
                      textAlign: 'center',
                      fontWeight: '500',
                      fontSize: '0.7rem',
                      color: '#666',
                      background: weekNum % 2 === 0 ? '#f0f0f0' : '#f8f9fa'
                    }}
                  >
                    Budget
                  </th>
                  <th
                    key={`${weekNum}-delta`}
                    style={{
                      padding: '0.4rem',
                      textAlign: 'center',
                      fontWeight: '500',
                      fontSize: '0.7rem',
                      color: '#666',
                      borderRight: '1px solid #dee2e6',
                      background: weekNum % 2 === 0 ? '#f0f0f0' : '#f8f9fa'
                    }}
                  >
                    Δ
                  </th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, teamIndex) => (
              <tr
                key={team.teamId}
                style={{
                  borderBottom: '1px solid #dee2e6',
                  background: teamIndex % 2 === 0 ? 'white' : '#fafafa'
                }}
              >
                <td
                  style={{
                    padding: '0.5rem',
                    position: 'sticky',
                    left: 0,
                    background: teamIndex % 2 === 0 ? 'white' : '#fafafa',
                    fontWeight: '500',
                    borderRight: '2px solid #dee2e6',
                    zIndex: 1
                  }}
                >
                  {team.teamName}
                </td>
                <td
                  style={{
                    padding: '0.5rem',
                    color: '#666',
                    borderRight: '2px solid #dee2e6'
                  }}
                >
                  {team.ownerName || '—'}
                </td>
                {team.weeks.map((week) => (
                  <>
                    <td
                      key={`${team.teamId}-${week.weekId}-pts`}
                      style={{
                        padding: '0.4rem',
                        textAlign: 'center',
                        color: week.points !== null && week.points > 0 ? '#28a745' : '#666'
                      }}
                    >
                      {week.points !== null ? week.points.toFixed(1) : '—'}
                    </td>
                    <td
                      key={`${team.teamId}-${week.weekId}-value`}
                      style={{
                        padding: '0.4rem',
                        textAlign: 'center',
                        color: '#333'
                      }}
                    >
                      {formatValue(week.totalValue)}
                    </td>
                    <td
                      key={`${team.teamId}-${week.weekId}-budget`}
                      style={{
                        padding: '0.4rem',
                        textAlign: 'center',
                        color: '#0066cc'
                      }}
                    >
                      {formatValue(week.budget)}
                    </td>
                    <td
                      key={`${team.teamId}-${week.weekId}-delta`}
                      style={{
                        padding: '0.4rem',
                        textAlign: 'center',
                        fontWeight: week.budgetDelta !== null ? '600' : '400',
                        color: getDeltaColor(week.budgetDelta),
                        borderRight: '1px solid #dee2e6'
                      }}
                    >
                      {formatDelta(week.budgetDelta)}
                    </td>
                  </>
                ))}
                <td
                  style={{
                    padding: '0.5rem',
                    textAlign: 'center',
                    fontWeight: '600',
                    background: '#e7f3ff'
                  }}
                >
                  {team.totalPoints.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#666' }}>
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Value:</strong> Total player value | <strong>Budget:</strong> $550k - Value (remaining cap space) | <strong>Δ:</strong> Budget change from previous week
        </p>
        <p style={{ margin: '0.25rem 0', fontStyle: 'italic' }}>
          <span style={{ color: '#28a745' }}>Green Δ</span> = gained budget space (player values dropped) |
          <span style={{ color: '#dc3545' }}> Red Δ</span> = lost budget space (player values increased)
        </p>
      </div>
    </Card>
  );
}
