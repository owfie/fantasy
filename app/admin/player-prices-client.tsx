'use client';

import { Card } from '@/components/Card';
import {
  usePlayerPricesTable,
  useTransferWindowStatuses,
  useCalculateFromWindow,
} from '@/lib/queries/price-calculation.queries';
import { TransferWindowStatus, getTransferWindowState, TransferWindowState } from '@/lib/domain/types';

interface PlayerPricesClientProps {
  seasonId?: string;
}

/**
 * Get state badge for a transfer window
 */
function getStateBadge(status: TransferWindowStatus | undefined): { text: string; color: string; bg: string } {
  if (!status || status.windowNumber === 0) {
    return { text: 'Starting', color: '#666', bg: '#f0f0f0' };
  }

  const state = getTransferWindowState(
    status.pricesCalculated,
    status.transferWindowOpen,
    status.cutoffTime,
    status.closedAt
  );

  switch (state) {
    case 'open':
      return { text: 'Open', color: '#fff', bg: '#10b981' }; // Green
    case 'ready':
      return { text: 'Ready', color: '#000', bg: '#fbbf24' }; // Yellow
    case 'completed':
      return { text: 'Completed', color: '#fff', bg: '#3b82f6' }; // Blue
    case 'upcoming':
      return { text: 'Upcoming', color: '#666', bg: '#e5e7eb' }; // Gray
    default:
      return { text: 'Unknown', color: '#666', bg: '#f0f0f0' };
  }
}

/**
 * Format a number as currency (in thousands)
 */
function formatPrice(value: number): string {
  return `$${Math.round(value)}`;
}

/**
 * Get color for price change (green for increase, red for decrease)
 */
function getPriceChangeColor(current: number, previous: number): string {
  if (current > previous) return '#28a745';
  if (current < previous) return '#dc3545';
  return '#666';
}

interface CalculateButtonProps {
  windowNumber: number;
  lastWindowWithStats: number;
  status: TransferWindowStatus | undefined;
  isLoading: boolean;
  calculatingWindow: number | null;
  onClick: () => void;
}

function CalculateButton({
  windowNumber,
  lastWindowWithStats,
  status,
  isLoading,
  calculatingWindow,
  onClick,
}: CalculateButtonProps) {
  if (windowNumber === 0) {
    // No button for TW 0 (starting prices)
    return null;
  }

  const canCalculate = status?.canCalculate ?? false;
  const isThisCalculating = calculatingWindow === windowNumber;

  // Only cascade to windows that have stats
  const cascadeEnd = lastWindowWithStats;
  const cascadeText = windowNumber < cascadeEnd
    ? `TW ${windowNumber}→${cascadeEnd}`
    : `TW ${windowNumber}`;

  return (
    <button
      onClick={onClick}
      disabled={!canCalculate || isLoading}
      title={
        !canCalculate
          ? `Week ${windowNumber} stats not entered yet`
          : `Calculate ${cascadeText}`
      }
      style={{
        padding: '0.2rem 0.4rem',
        fontSize: '0.65rem',
        border: 'none',
        borderRadius: '4px',
        cursor: canCalculate && !isLoading ? 'pointer' : 'not-allowed',
        background: canCalculate ? '#0066cc' : '#ccc',
        color: canCalculate ? 'white' : '#666',
        opacity: isLoading && !isThisCalculating ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {isThisCalculating ? '...' : `Calc ${cascadeText}`}
    </button>
  );
}

export default function PlayerPricesClient({ seasonId }: PlayerPricesClientProps) {
  const { data, isLoading, error } = usePlayerPricesTable(seasonId);
  const { data: windowStatuses } = useTransferWindowStatuses(seasonId);
  const calculateMutation = useCalculateFromWindow();

  // Track which window is being calculated
  const calculatingWindow = calculateMutation.isPending
    ? (calculateMutation.variables?.startingWindowNumber ?? null)
    : null;

  if (!seasonId) {
    return (
      <Card>
        <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Player Prices</h4>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
          Select a season to view player prices
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Player Prices</h4>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
          Loading...
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Player Prices</h4>
        <p style={{ color: '#dc3545', fontSize: '0.9rem', margin: 0 }}>
          Error: {error.message}
        </p>
      </Card>
    );
  }

  if (!data || data.players.length === 0) {
    return (
      <Card>
        <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Player Prices</h4>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
          No players found for this season
        </p>
      </Card>
    );
  }

  const { players, weeks } = data;

  // Build window status map for quick lookup
  const statusMap = new Map<number, TransferWindowStatus>(
    (windowStatuses || []).map(s => [s.windowNumber, s])
  );

  // Find the last window that has stats (for cascade button text)
  const lastWindowWithStats = (windowStatuses || [])
    .filter(s => s.hasRequiredStats && s.windowNumber >= 1)
    .reduce((max, s) => Math.max(max, s.windowNumber), 0);

  const handleCalculateWindow = (windowNumber: number) => {
    if (seasonId) {
      calculateMutation.mutate({ seasonId, startingWindowNumber: windowNumber });
    }
  };

  return (
    <Card>
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>Player Prices</h4>
        <p style={{ color: '#666', fontSize: '0.8rem', margin: 0 }}>
          Transfer window prices with per-window calculation
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            {/* Main header row - TW labels */}
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
              <th
                rowSpan={3}
                style={{
                  padding: '0.5rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  position: 'sticky',
                  left: 0,
                  background: '#f8f9fa',
                  zIndex: 2,
                  borderRight: '1px solid #dee2e6',
                  minWidth: '140px'
                }}
              >
                Player
              </th>
              <th
                rowSpan={3}
                style={{
                  padding: '0.5rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  position: 'sticky',
                  left: '140px',
                  background: '#f8f9fa',
                  zIndex: 2,
                  borderRight: '2px solid #dee2e6',
                  minWidth: '100px'
                }}
              >
                Team
              </th>
              {/* TW 0 - Starting */}
              <th
                rowSpan={3}
                style={{
                  padding: '0.5rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  background: '#e7f3ff',
                  borderRight: '2px solid #dee2e6',
                  minWidth: '70px',
                  verticalAlign: 'middle'
                }}
              >
                <div>TW 0</div>
                <div style={{ fontSize: '0.65rem', fontWeight: '400', color: '#666' }}>
                  (Starting)
                </div>
              </th>
              {/* TW 1, 2, 3... */}
              {weeks.map((week, index) => {
                const status = statusMap.get(week.week_number);
                const badge = getStateBadge(status);
                return (
                  <th
                    key={week.id}
                    colSpan={2}
                    style={{
                      padding: '0.5rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      borderRight: index < weeks.length - 1 ? '1px solid #dee2e6' : 'none',
                      background: week.week_number % 2 === 0 ? '#f0f0f0' : '#f8f9fa'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <span>TW {week.week_number}</span>
                      <span style={{
                        fontSize: '0.55rem',
                        fontWeight: '500',
                        padding: '0.1rem 0.3rem',
                        borderRadius: '3px',
                        background: badge.bg,
                        color: badge.color,
                      }}>
                        {badge.text}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: '400', color: '#666' }}>
                      (Week {week.week_number} Stats)
                    </div>
                  </th>
                );
              })}
            </tr>
            {/* Sub-header row - Pts/Price labels */}
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
              {weeks.map((week, index) => (
                <>
                  <th
                    key={`${week.id}-pts`}
                    style={{
                      padding: '0.3rem',
                      textAlign: 'center',
                      fontWeight: '500',
                      fontSize: '0.7rem',
                      color: '#666',
                      background: week.week_number % 2 === 0 ? '#f0f0f0' : '#f8f9fa'
                    }}
                  >
                    W{week.week_number} Pts
                  </th>
                  <th
                    key={`${week.id}-price`}
                    style={{
                      padding: '0.3rem',
                      textAlign: 'center',
                      fontWeight: '500',
                      fontSize: '0.7rem',
                      color: '#666',
                      borderRight: index < weeks.length - 1 ? '1px solid #dee2e6' : 'none',
                      background: week.week_number % 2 === 0 ? '#f0f0f0' : '#f8f9fa'
                    }}
                  >
                    Price
                  </th>
                </>
              ))}
            </tr>
            {/* Button row */}
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              {weeks.map((week, index) => (
                <th
                  key={`${week.id}-btn`}
                  colSpan={2}
                  style={{
                    padding: '0.3rem',
                    textAlign: 'center',
                    borderRight: index < weeks.length - 1 ? '1px solid #dee2e6' : 'none',
                    background: week.week_number % 2 === 0 ? '#f0f0f0' : '#f8f9fa'
                  }}
                >
                  <CalculateButton
                    windowNumber={week.week_number}
                    lastWindowWithStats={lastWindowWithStats}
                    status={statusMap.get(week.week_number)}
                    isLoading={calculateMutation.isPending}
                    calculatingWindow={calculatingWindow}
                    onClick={() => handleCalculateWindow(week.week_number)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((player, playerIndex) => {
              let previousPrice = player.startingPrice;

              return (
                <tr
                  key={player.playerId}
                  style={{
                    borderBottom: '1px solid #dee2e6',
                    background: playerIndex % 2 === 0 ? 'white' : '#fafafa'
                  }}
                >
                  <td
                    style={{
                      padding: '0.5rem',
                      position: 'sticky',
                      left: 0,
                      background: playerIndex % 2 === 0 ? 'white' : '#fafafa',
                      fontWeight: '500',
                      borderRight: '1px solid #dee2e6',
                      zIndex: 1
                    }}
                  >
                    {player.playerName}
                  </td>
                  <td
                    style={{
                      padding: '0.5rem',
                      position: 'sticky',
                      left: '140px',
                      background: playerIndex % 2 === 0 ? 'white' : '#fafafa',
                      color: '#666',
                      borderRight: '2px solid #dee2e6',
                      zIndex: 1
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        background: player.teamColor || '#e0e0e0',
                        color: player.teamColor ? 'white' : '#333'
                      }}
                    >
                      {player.teamName || '—'}
                    </span>
                  </td>
                  {/* TW 0 - Starting price */}
                  <td
                    style={{
                      padding: '0.5rem',
                      textAlign: 'center',
                      fontWeight: '600',
                      background: '#e7f3ff',
                      borderRight: '2px solid #dee2e6'
                    }}
                  >
                    {formatPrice(player.startingPrice)}
                  </td>
                  {/* TW 1, 2, 3... */}
                  {weeks.map((week, index) => {
                    const twData = player.transferWindowData.get(week.week_number);
                    const stats = twData?.weekStats;
                    const points = stats?.points ?? 0;
                    const played = stats?.played ?? false;
                    const price = twData?.price ?? previousPrice;
                    const priceColor = getPriceChangeColor(price, previousPrice);
                    const windowStatus = statusMap.get(week.week_number);
                    const hasStats = windowStatus?.hasRequiredStats ?? false;

                    // Update previousPrice for next iteration
                    const prevForColor = previousPrice;
                    previousPrice = price;

                    return (
                      <>
                        <td
                          key={`${player.playerId}-${week.id}-pts`}
                          style={{
                            padding: '0.4rem',
                            textAlign: 'center',
                            color: !played ? '#999' : points > 0 ? '#28a745' : '#666',
                            fontWeight: played && points > 0 ? '500' : '400',
                            fontStyle: !hasStats ? 'italic' : 'normal',
                            background: !hasStats ? '#f9f9f9' : undefined
                          }}
                        >
                          {!hasStats ? '—' : played ? points : '—'}
                        </td>
                        <td
                          key={`${player.playerId}-${week.id}-price`}
                          style={{
                            padding: '0.4rem',
                            textAlign: 'center',
                            color: !hasStats ? '#999' : !played ? '#999' : getPriceChangeColor(price, prevForColor),
                            fontWeight: '500',
                            fontStyle: !hasStats ? 'italic' : 'normal',
                            borderRight: index < weeks.length - 1 ? '1px solid #dee2e6' : 'none',
                            background: !hasStats ? '#f9f9f9' : undefined
                          }}
                        >
                          {!hasStats ? '—' : formatPrice(price)}
                        </td>
                      </>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#666' }}>
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Transfer Windows:</strong> TW 0 = Starting price (manual) | TW N = Price after Week N stats
        </p>
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Formula:</strong> NewPrice = PreviousPrice + (10 × TwoWeekAvgPoints - PreviousPrice) / 4
        </p>
        <p style={{ margin: '0.25rem 0' }}>
          <span style={{ color: '#28a745' }}>Green</span> = price increased |
          <span style={{ color: '#dc3545' }}> Red</span> = price decreased |
          <span style={{ fontStyle: 'italic', color: '#999' }}> — (italic)</span> = no stats entered yet
        </p>
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Window States:</strong>{' '}
          <span style={{ background: '#e5e7eb', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.7rem' }}>Upcoming</span> = no stats yet |{' '}
          <span style={{ background: '#fbbf24', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.7rem' }}>Ready</span> = prices calculated, pending review |{' '}
          <span style={{ background: '#10b981', color: 'white', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.7rem' }}>Open</span> = users can transfer |{' '}
          <span style={{ background: '#3b82f6', color: 'white', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.7rem' }}>Completed</span> = window closed
        </p>
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Note:</strong> Prices auto-calculate when stats are saved. Use Transfer Windows page to open/close windows.
        </p>
      </div>
    </Card>
  );
}
