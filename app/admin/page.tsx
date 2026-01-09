/**
 * Admin Dashboard
 * Sidebar navigation with section-based content
 * Renders existing components without modifying their functionality
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
import { Card } from '@/components/Card';
import styles from './admin.module.scss';

type Section = 'statistics' | 'data' | 'fantasy' | 'tests' | 'users';
type DataTab = 'seasons' | 'teams' | 'players';

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: 'statistics', label: 'Statistics', icon: '📊' },
  { id: 'data', label: 'Data Management', icon: '🗃️' },
  { id: 'fantasy', label: 'Fantasy', icon: '⚽' },
  { id: 'tests', label: 'Tests', icon: '🧪' },
  { id: 'users', label: 'Users', icon: '👤' },
];

const DATA_TABS: { id: DataTab; label: string }[] = [
  { id: 'seasons', label: 'Seasons' },
  { id: 'teams', label: 'Teams' },
  { id: 'players', label: 'Players' },
];

export default function AdminPage() {
  // Navigation state
  const [activeSection, setActiveSection] = useState<Section>('statistics');
  const [dataTab, setDataTab] = useState<DataTab>('seasons');
  const [isLocalhost, setIsLocalhost] = useState<boolean>(false);
  
  // Check if we're on localhost (client-side only to avoid hydration errors)
  useEffect(() => {
    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    setIsLocalhost(isLocal);
    
    // If we're not on localhost and somehow on tests section, redirect to statistics
    if (!isLocal && activeSection === 'tests') {
      setActiveSection('statistics');
    }
  }, [activeSection]);
  
  // Filter nav items - only show tests on localhost
  const visibleNavItems = NAV_ITEMS.filter(item => item.id !== 'tests' || isLocalhost);

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

  // Dashboard data for stats display
  const { data: dashboardData } = useTestDashboard(selectedSeasonId);

  const isConnected = !!dashboardData || seasons.length > 0;
  const teams = dashboardData?.teams || [];
  const players = dashboardData?.players || [];
  const weeks = dashboardData?.weeks || [];
  const testData = dashboardData?.testData || {};
  const playerPoints = dashboardData?.playerPoints || [];

  // Show warning if no season selected for season-dependent sections
  const needsSeasonWarning = !selectedSeasonId && (activeSection === 'statistics');

  return (
    <div className={styles.dashboard}>
      {/* Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.seasonSelector}>
          <label>Season</label>
          <select
            value={selectedSeasonId || ''}
            onChange={(e) => setSelectedSeasonId(e.target.value || undefined)}
          >
            <option value="">Select a Season</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name} {season.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.statsCards}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{teams.length}</span>
            <span className={styles.statLabel}>Teams</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{players.length}</span>
            <span className={styles.statLabel}>Players</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{weeks.length}</span>
            <span className={styles.statLabel}>Weeks</span>
          </div>
        </div>

        <div className={`${styles.dbStatus} ${isConnected ? styles.connected : styles.disconnected}`}>
          <span className={styles.statusDot} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </header>

      {/* Sidebar */}
      <nav className={styles.sidebar}>
        <div className={styles.navSection}>
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeSection === item.id ? styles.active : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content Area */}
      <main className={styles.content}>
        {/* STATISTICS SECTION */}
        {activeSection === 'statistics' && (
          <>
            <div className={styles.contentHeader}>
              <h2>Statistics</h2>
            </div>
            {needsSeasonWarning ? (
              <div className={styles.warning}>
                <h3>No Season Selected</h3>
                <p>Please select a season from the dropdown above to view statistics.</p>
              </div>
            ) : (
              <AdminDashboard seasonId={selectedSeasonId} />
            )}
          </>
        )}

        {/* DATA MANAGEMENT SECTION */}
        {activeSection === 'data' && (
          <>
            <div className={styles.contentHeader}>
              <h2>Data Management</h2>
              <div className={styles.segmentedController}>
                {DATA_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    className={`${styles.segment} ${dataTab === tab.id ? styles.active : ''}`}
                    onClick={() => setDataTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            {dataTab === 'seasons' && <SeasonsCrudClient />}
            {dataTab === 'teams' && <TeamsCrudClient seasonId={selectedSeasonId} />}
            {dataTab === 'players' && <PlayersCrudClient />}
          </>
        )}

        {/* FANTASY SECTION */}
        {activeSection === 'fantasy' && (
          <>
            <div className={styles.contentHeader}>
              <h2>Fantasy Teams</h2>
            </div>
            <FantasyTeamsCrudClient seasonId={selectedSeasonId} />
          </>
        )}

        {/* TESTS SECTION */}
        {activeSection === 'tests' && (
          <>
            <div className={styles.contentHeader}>
              <h2>Testing & Debugging</h2>
            </div>
            {Object.keys(testData).length > 0 ? (
              <TestClient testData={testData} />
            ) : (
              <div className={styles.warning}>
                <h3>No Test Data</h3>
                <p>Select a season with data to run tests.</p>
              </div>
            )}
            
            {/* Player Points Table */}
            {selectedSeasonId && weeks.length > 0 && playerPoints.length > 0 && (
              <Card>
                <h3 style={{ margin: '0 0 1rem 0' }}>Player Points Table</h3>
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
              </Card>
            )}
            
            {/* Requirements Checklist */}
            <Card>
              <h3 style={{ margin: '0 0 1rem 0' }}>Requirements Checklist</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {[
                  { done: true, label: 'Players with starting values' },
                  { done: true, label: "Player stats (goals, assists, D's, drops, turnovers)" },
                  { done: true, label: 'Points calculation formula' },
                  { done: true, label: 'Fantasy teams with salary cap (team value)' },
                  { done: true, label: 'Captain selection (double points)' },
                  { done: true, label: 'Add/remove players from teams' },
                  { done: true, label: 'Transaction support (Unit of Work)' },
                  { done: true, label: 'Season-based player management' },
                  { done: false, label: 'Trades (up to 2 per week)' },
                  { done: false, label: 'Value appreciation/depreciation' },
                  { done: false, label: 'Bracket playoff' },
                ].map((item, i) => (
                  <li key={i} style={{ 
                    padding: '0.5rem 0',
                    borderBottom: i < 10 ? '1px solid #f0f0f0' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#444',
                    fontSize: '0.9rem'
                  }}>
                    <span>{item.done ? '✅' : '⏳'}</span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}

        {/* USERS SECTION */}
        {activeSection === 'users' && (
          <>
            <div className={styles.contentHeader}>
              <h2>Users</h2>
            </div>
            <UsersListClient />
          </>
        )}
      </main>
    </div>
  );
}
