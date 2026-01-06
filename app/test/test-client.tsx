'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import {
  testCreateTeam,
  testCreatePlayer,
  testCreateFantasyTeam,
  testCalculateTeamValue,
  testSetCaptain,
  testAddPlayerStats,
  testGetPlayerStats,
  testAddPlayerToTeam,
  testRemovePlayerFromTeam,
  testGetFantasyTeam,
  testTransactionRollback,
  testCreateSeasonAndWeek,
  testCreateGame,
} from '@/lib/api';

interface TestData {
  firstTeamId?: string;
  secondTeamId?: string;
  firstPlayerId?: string;
  firstFivePlayerIds?: string[];
  adminUserId?: string;
  seasonId?: string;
  weekId?: string;
  gameId?: string;
  fantasyTeamId?: string;
}


interface TestResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export default function TestClient({ testData: initialTestData }: { testData: TestData }) {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [testData, setTestData] = useState<TestData>(initialTestData);

  const runTest = async (testName: string, testFn: () => Promise<TestResult>, updateData?: (result: TestResult) => Partial<TestData>) => {
    setLoading((prev) => ({ ...prev, [testName]: true }));
    try {
      const result = await testFn();
      setResults((prev) => ({ ...prev, [testName]: result }));
      
      // Update test data if callback provided
      if (updateData && result.success && result.data) {
        const newData = updateData(result);
        setTestData((prev) => ({ ...prev, ...newData }));
      }
      
      // Show toast notification for UoW action completion
      if (result.success) {
        toast.success('Action completed', { description: result.message });
      } else {
        toast.error('Action failed', { description: result.message || result.error });
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      const errorResult = {
        success: false,
        message: 'Test failed',
        error: message,
      };
      setResults((prev) => ({
        ...prev,
        [testName]: errorResult,
      }));
      toast.error('Test failed', { description: error instanceof Error ? error.message : 'An unknown error occurred' });
    } finally {
      setLoading((prev) => ({ ...prev, [testName]: false }));
    }
  };

  const TestButton = ({
    testName,
    label,
    testFn,
    disabled,
    updateData,
  }: {
    testName: string;
    label: string;
    testFn: () => Promise<TestResult>;
    disabled?: boolean;
    updateData?: (result: TestResult) => Partial<TestData>;
  }) => {
    const result = results[testName];
    const isLoading = loading[testName];

    return (
      <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <strong>{label}</strong>
          <button
            onClick={() => runTest(testName, testFn, updateData)}
            disabled={isLoading || disabled}
            style={{
              padding: '0.5rem 1rem',
              background: isLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading || disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Running...' : 'Run Test'}
          </button>
        </div>
        {result && (
          <div
            style={{
              padding: '0.5rem',
              background: result.success ? '#d4edda' : '#f8d7da',
              borderRadius: '4px',
              fontSize: '0.9rem',
            }}
          >
            <div>
              <strong>{result.success ? '✅' : '❌'}</strong> {result.message}
            </div>
            {result.error && <div style={{ color: '#721c24', marginTop: '0.5rem' }}>{result.error}</div>}
            {result.data !== undefined && (
              <details style={{ marginTop: '0.5rem' }}>
                <summary style={{ cursor: 'pointer', color: '#007bff' }}>View Data</summary>
                <pre style={{ marginTop: '0.5rem', fontSize: '0.8rem', overflow: 'auto' }}>
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h3>🧪 Interactive Tests</h3>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Test all Unit of Work functionality and domain services based on REQUIREMENTS.md
      </p>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {/* Basic CRUD Tests */}
        <div>
          <h4>Basic CRUD Operations</h4>
          <TestButton
            testName="createTeam"
            label="1. Create Team"
            testFn={() => testCreateTeam('Test Team', '#FF5733')}
          />
          <TestButton
            testName="createPlayer"
            label="2. Create Player with Starting Value"
            testFn={() =>
              testCreatePlayer(
                testData.firstTeamId || '',
                'Test',
                'Player',
                'player',
                50,
                1
              )
            }
            disabled={!testData.firstTeamId}
          />
        </div>

        {/* Fantasy Team Tests */}
        <div>
          <h4>Fantasy Team & Salary Cap</h4>
          <TestButton
            testName="createSeason"
            label="3. Create Season & Week"
            testFn={() => testCreateSeasonAndWeek()}
            updateData={(result) => {
              const data = result.data as { season?: { id: string }; week?: { id: string } } | undefined;
              if (data?.season && data?.week) {
                return {
                  seasonId: data.season.id,
                  weekId: data.week.id,
                };
              }
              return {};
            }}
          />
          <TestButton
            testName="createGame"
            label="3b. Create Test Game"
            testFn={() =>
              testCreateGame(
                testData.weekId || '',
                testData.firstTeamId || '',
                testData.secondTeamId || testData.firstTeamId || ''
              )
            }
            updateData={(result) => {
              const data = result.data as { id?: string } | undefined;
              if (data?.id) {
                return { gameId: data.id };
              }
              return {};
            }}
            disabled={!testData.weekId || !testData.firstTeamId}
          />
          <TestButton
            testName="createFantasyTeam"
            label="4. Create Fantasy Team (10 players, salary cap)"
            testFn={() =>
              testCreateFantasyTeam(
                testData.adminUserId || '2eb0941a-b6bf-418a-a711-4db9426f5161',
                testData.seasonId || '',
                'Test Fantasy Team',
                testData.firstFivePlayerIds?.slice(0, 10) || []
              )
            }
            updateData={(result) => {
              const data = result.data as { id?: string } | undefined;
              if (data?.id) {
                return { fantasyTeamId: data.id };
              }
              return {};
            }}
            disabled={!testData.seasonId || !testData.firstFivePlayerIds || testData.firstFivePlayerIds.length < 10}
          />
          <TestButton
            testName="calculateTeamValue"
            label="5. Calculate Team Value (Salary Cap)"
            testFn={() => testCalculateTeamValue(testData.fantasyTeamId || '')}
            disabled={!testData.fantasyTeamId}
          />
          <TestButton
            testName="getFantasyTeam"
            label="6. Get Fantasy Team with Players"
            testFn={() => testGetFantasyTeam(testData.fantasyTeamId || '')}
            disabled={!testData.fantasyTeamId}
          />
        </div>

        {/* Captain & Points Tests */}
        <div>
          <h4>Captain & Points System</h4>
          <TestButton
            testName="setCaptain"
            label="7. Set Captain (Double Points)"
            testFn={() =>
              testSetCaptain(
                testData.fantasyTeamId || '',
                testData.firstPlayerId || ''
              )
            }
            disabled={!testData.fantasyTeamId || !testData.firstPlayerId}
          />
          <TestButton
            testName="addPlayerStats"
            label="8. Add Player Stats (Goals, Assists, Blocks, Drops, Turnovers)"
            testFn={() =>
              testAddPlayerStats(
                testData.firstPlayerId || '',
                testData.gameId || '',
                {
                  goals: 3,
                  assists: 2,
                  blocks: 1,
                  drops: 0,
                  throwaways: 1,
                },
                testData.adminUserId
              )
            }
            disabled={!testData.firstPlayerId || !testData.gameId}
          />
          <TestButton
            testName="getPlayerStats"
            label="9. Get Player Stats & Verify Points Calculation"
            testFn={() => testGetPlayerStats(testData.firstPlayerId || '')}
            disabled={!testData.firstPlayerId}
          />
        </div>

        {/* Roster Management Tests */}
        <div>
          <h4>Roster Management</h4>
          <TestButton
            testName="addPlayerToTeam"
            label="10. Add Player to Fantasy Team"
            testFn={() =>
              testAddPlayerToTeam(
                testData.fantasyTeamId || '',
                testData.firstPlayerId || '',
                { isReserve: true }
              )
            }
            disabled={!testData.fantasyTeamId || !testData.firstPlayerId}
          />
          <TestButton
            testName="removePlayerFromTeam"
            label="11. Remove Player from Fantasy Team"
            testFn={() =>
              testRemovePlayerFromTeam(
                testData.fantasyTeamId || '',
                testData.firstPlayerId || ''
              )
            }
            disabled={!testData.fantasyTeamId || !testData.firstPlayerId}
          />
        </div>

        {/* Transaction Tests */}
        <div>
          <h4>Unit of Work & Transactions</h4>
          <TestButton
            testName="transactionRollback"
            label="12. Test Transaction Rollback"
            testFn={testTransactionRollback}
          />
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff3cd', borderRadius: '4px' }}>
        <h4>📋 Requirements Coverage</h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>✅ Players with starting values</li>
          <li>✅ Player stats (goals, assists, blocks, drops, turnovers)</li>
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
    </div>
  );
}

