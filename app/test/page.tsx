/**
 * Comprehensive test page for Unit of Work and domain functionality
 * Tests all features based on REQUIREMENTS.md
 * Now uses TanStack Query for data fetching
 */

'use client';

import { useState, useEffect } from 'react';
import { useTestDashboard } from '@/lib/queries/test.queries';
import { useSeasons, useActiveSeason } from '@/lib/queries/seasons.queries';

import TestClient from './test-client';
import TeamsCrudClient from './teams-crud-client';
import PlayersCrudClient from './players-crud-client';
import SeasonsCrudClient from './seasons-crud-client';
import AdminDashboard from './admin-dashboard';
import FantasyTeamsCrudClient from './fantasy-teams-crud-client';
import UsersListClient from './users-list-client';
import styles from './page.module.scss';

interface AccordionSectionProps {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function AccordionSection({ title, icon, defaultOpen = false, children }: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className={styles.accordion}>
      <div 
        className={`${styles.accordionHeader} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h4>
          <span className={styles.icon}>{icon}</span>
          {title}
        </h4>
        <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && (
        <div className={styles.accordionContent}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function TestPage() {
  // Season management
  const { data: seasons = [], isLoading: isLoadingSeasons } = useSeasons();
  const { data: activeSeason } = useActiveSeason();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(undefined);

  // Set default season to active season when loaded
  useEffect(() => {
    if (activeSeason && !selectedSeasonId) {
      setSelectedSeasonId(activeSeason.id);
    }
  }, [activeSeason, selectedSeasonId]);

  // Dashboard data - filtered by selected season
  const { data: dashboardData, isLoading: isLoadingDashboard, error } = useTestDashboard(selectedSeasonId);

  const isLoading = isLoadingSeasons || isLoadingDashboard;

  if (isLoading && !selectedSeasonId) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Super League Fantasy - Admin Test Suite</h1>
          <p className={styles.subtitle}>Loading dashboard data...</p>
        </div>
        <div className={`${styles.statusBar} ${styles.connected}`}>
          Connecting to database...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Super League Fantasy - Admin Test Suite</h1>
        </div>
        <div className={`${styles.statusBar} ${styles.error}`}>
          Database Error: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  const isConnected = !!dashboardData || seasons.length > 0;
  const teams = dashboardData?.teams || [];
  const players = dashboardData?.players || [];
  const weeks = dashboardData?.weeks || [];
  const playerPoints = dashboardData?.playerPoints || [];
  const testData = dashboardData?.testData || {};
  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Super League Fantasy - Admin Test Suite</h1>
        <p className={styles.subtitle}>Test and manage all domain functionality</p>
      </div>

      {/* Season Selector - Prominent at the top */}
      <div style={{ 
        padding: '1.25rem', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        borderRadius: '8px', 
        marginBottom: '1.5rem',
        color: 'white',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.1rem', fontWeight: 600 }}>
              Active Season
            </h3>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
              All data below is filtered by the selected season
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <select
              value={selectedSeasonId || ''}
              onChange={(e) => setSelectedSeasonId(e.target.value || undefined)}
              style={{
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                fontWeight: 500,
                borderRadius: '6px',
                border: 'none',
                background: 'white',
                color: '#333',
                minWidth: '250px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              <option value="">-- Select a Season --</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} {season.is_active ? '(Active)' : ''} ({season.start_date} - {season.end_date})
                </option>
              ))}
            </select>
            {selectedSeason && (
              <div style={{ 
                padding: '0.5rem 1rem', 
                background: 'rgba(255,255,255,0.2)', 
                borderRadius: '6px',
                fontSize: '0.9rem'
              }}>
                <strong>{players.length}</strong> players, <strong>{weeks.length}</strong> weeks
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className={`${styles.statusBar} ${isConnected ? styles.connected : styles.error}`}>
        {isConnected ? 'Database Connected' : 'Database Error'}
        {selectedSeason && ` | Viewing: ${selectedSeason.name}`}
      </div>

      {/* No Season Selected Warning */}
      {!selectedSeasonId && (
        <div style={{ 
          padding: '2rem', 
          background: '#fff3cd', 
          borderRadius: '8px', 
          textAlign: 'center',
          marginBottom: '1.5rem',
          border: '1px solid #ffc107'
        }}>
          <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#856404' }}>No Season Selected</h3>
          <p style={{ margin: 0, color: '#856404' }}>
            Please select a season from the dropdown above to view and manage data.
            {seasons.length === 0 && ' No seasons exist yet - create one in the Seasons section below.'}
          </p>
        </div>
      )}

      {/* Quick Stats Overview - Only show if season selected */}
      {selectedSeasonId && (
        <div className={styles.overviewGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Teams</div>
            <div className={styles.statValue}>{teams.length}</div>
            {teams.length > 0 && (
              <ul className={styles.statList}>
                {teams.slice(0, 3).map((team) => (
                  <li key={team.id}>
                    {team.name} {team.color && <span style={{ color: team.color }}>●</span>}
                  </li>
                ))}
                {teams.length > 3 && <li>+{teams.length - 3} more</li>}
              </ul>
            )}
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Season Players</div>
            <div className={styles.statValue}>{players.length}</div>
            {players.length > 0 && (
              <ul className={styles.statList}>
                {players.slice(0, 3).map((player) => (
                  <li key={player.id}>
                    {player.first_name} {player.last_name}
                  </li>
                ))}
                {players.length > 3 && <li>+{players.length - 3} more</li>}
              </ul>
            )}
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Weeks</div>
            <div className={styles.statValue}>{weeks.length}</div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Player Stats</div>
            <div className={styles.statValue}>{playerPoints.filter(p => p.totalPoints !== 0).length}</div>
          </div>
        </div>
      )}

      {isConnected && (
        <>
          {/* Section 1: Users & Fantasy Teams */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.icon}>⚽</span>
              Fantasy Management
            </h2>
            
            <div className={styles.twoColumn}>
              <div className={styles.card}>
                <UsersListClient />
              </div>
              <div className={styles.card}>
                <FantasyTeamsCrudClient />
              </div>
            </div>
          </div>

          {/* Section 2: Admin Dashboard - Stats Entry (Season-filtered) */}
          {selectedSeasonId && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.icon}>📊</span>
                Stats Entry
                {selectedSeason && <span style={{ fontWeight: 'normal', fontSize: '0.9rem', marginLeft: '0.5rem' }}>({selectedSeason.name})</span>}
              </h2>
              <AdminDashboard seasonId={selectedSeasonId} />
            </div>
          )}

          {/* Section 3: Data Management (Collapsible) */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.icon}>🗃️</span>
              Data Management
            </h2>
            
            <AccordionSection title="Seasons & Season Players" icon="📅" defaultOpen={!selectedSeasonId}>
              <SeasonsCrudClient />
            </AccordionSection>
            
            <AccordionSection title="Teams CRUD" icon="🏈" defaultOpen={false}>
              <TeamsCrudClient seasonId={selectedSeasonId} />
            </AccordionSection>
            
            <AccordionSection title="Players CRUD" icon="👤" defaultOpen={false}>
              <PlayersCrudClient />
            </AccordionSection>
          </div>

          {/* Section 4: Testing & Debugging (Collapsible) */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.icon}>🔧</span>
              Testing & Debugging
            </h2>
            
            {Object.keys(testData).length > 0 && (
              <AccordionSection title="Interactive Tests" icon="🧪" defaultOpen={false}>
                <TestClient testData={testData} />
              </AccordionSection>
            )}
            
            {selectedSeasonId && (
              <AccordionSection title="Player Points Table" icon="📈" defaultOpen={false}>
                {weeks.length === 0 ? (
                  <div className={`${styles.infoBox} ${styles.warning}`}>
                    <p>No weeks found for this season. Create weeks first.</p>
                  </div>
                ) : playerPoints.length === 0 ? (
                  <div className={`${styles.infoBox} ${styles.warning}`}>
                    <p>No players in this season yet. Add players to the season first.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6', position: 'sticky', left: 0, background: '#f8f9fa' }}>
                            Player
                          </th>
                          {weeks.map((week) => (
                            <th key={week.id} style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                              {week.name || `W${week.week_number}`}
                            </th>
                          ))}
                          <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', background: '#e7f3ff' }}>
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerPoints.slice(0, 10).map((player, index) => (
                          <tr key={player.playerId} style={{ background: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                            <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #dee2e6', position: 'sticky', left: 0, background: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                              {player.playerName}
                            </td>
                            {weeks.map((week) => {
                              const points = player.weekPoints[week.id] || 0;
                              return (
                                <td key={week.id} style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', color: points > 0 ? '#28a745' : points < 0 ? '#dc3545' : '#666' }}>
                                  {points !== 0 ? points : '-'}
                                </td>
                              );
                            })}
                            <td style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: 'bold', background: '#e7f3ff' }}>
                              {player.totalPoints}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {playerPoints.length > 10 && (
                      <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.85rem' }}>
                        Showing 10 of {playerPoints.length} players
                      </p>
                    )}
                  </div>
                )}
                
                <div className={`${styles.infoBox} ${styles.info}`} style={{ marginTop: '1rem' }}>
                  <h4>Points Formula</h4>
                  <p>Goals + (Assists × 2) + (Blocks × 3) - Drops - Throwaways</p>
                </div>
              </AccordionSection>
            )}
            
            <AccordionSection title="Requirements Checklist" icon="✅" defaultOpen={false}>
              <ul className={styles.requirementsList}>
                <li>✅ Players with starting values</li>
                <li>✅ Player stats (goals, assists, D&apos;s, drops, turnovers)</li>
                <li>✅ Points calculation formula</li>
                <li>✅ Fantasy teams with salary cap (team value)</li>
                <li>✅ Captain selection (double points)</li>
                <li>✅ Add/remove players from teams</li>
                <li>✅ Transaction support (Unit of Work)</li>
                <li>✅ Season-based player management</li>
                <li>⏳ Trades (up to 2 per week) - Coming soon</li>
                <li>⏳ Value appreciation/depreciation - Coming soon</li>
                <li>⏳ Bracket playoff - Coming soon</li>
              </ul>
            </AccordionSection>
          </div>
        </>
      )}
    </div>
  );
}
