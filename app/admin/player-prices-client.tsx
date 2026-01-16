'use client';

import { Card } from '@/components/Card';
import { Button } from './shared/crud-components';
import { usePlayerPricesTable, useRecalculatePrices } from '@/lib/queries/price-calculation.queries';

interface PlayerPricesClientProps {
  seasonId?: string;
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

export default function PlayerPricesClient({ seasonId }: PlayerPricesClientProps) {
  const { data, isLoading, error } = usePlayerPricesTable(seasonId);
  const recalculateMutation = useRecalculatePrices();

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

  const handleRecalculate = () => {
    if (seasonId) {
      recalculateMutation.mutate(seasonId);
    }
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>Player Prices</h4>
          <p style={{ color: '#666', fontSize: '0.8rem', margin: 0 }}>
            Week-by-week points and calculated prices
          </p>
        </div>
        <Button
          onClick={handleRecalculate}
          variant="primary"
          isLoading={recalculateMutation.isPending}
        >
          Recalculate & Save Prices
        </Button>
      </div>

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
                  borderRight: '1px solid #dee2e6',
                  minWidth: '140px'
                }}
              >
                Player
              </th>
              <th
                rowSpan={2}
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
              <th
                rowSpan={2}
                style={{
                  padding: '0.5rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  background: '#e7f3ff',
                  borderRight: '2px solid #dee2e6',
                  minWidth: '70px'
                }}
              >
                Starting
              </th>
              {weeks.map((week, index) => (
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
                  Week {week.week_number}
                </th>
              ))}
            </tr>
            {/* Sub-header row */}
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              {weeks.map((week, index) => (
                <>
                  <th
                    key={`${week.id}-pts`}
                    style={{
                      padding: '0.4rem',
                      textAlign: 'center',
                      fontWeight: '500',
                      fontSize: '0.7rem',
                      color: '#666',
                      background: week.week_number % 2 === 0 ? '#f0f0f0' : '#f8f9fa'
                    }}
                  >
                    Pts
                  </th>
                  <th
                    key={`${week.id}-price`}
                    style={{
                      padding: '0.4rem',
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
                  {weeks.map((week, index) => {
                    const weekData = player.weekData.get(week.week_number);
                    const points = weekData?.points ?? 0;
                    const price = weekData?.price ?? previousPrice;
                    const priceColor = getPriceChangeColor(price, previousPrice);

                    // Update previousPrice for next iteration
                    const currentPreviousPrice = previousPrice;
                    previousPrice = price;

                    return (
                      <>
                        <td
                          key={`${player.playerId}-${week.id}-pts`}
                          style={{
                            padding: '0.4rem',
                            textAlign: 'center',
                            color: points > 0 ? '#28a745' : '#999',
                            fontWeight: points > 0 ? '500' : '400'
                          }}
                        >
                          {points}
                        </td>
                        <td
                          key={`${player.playerId}-${week.id}-price`}
                          style={{
                            padding: '0.4rem',
                            textAlign: 'center',
                            color: week.week_number === 1 ? '#333' : priceColor,
                            fontWeight: '500',
                            borderRight: index < weeks.length - 1 ? '1px solid #dee2e6' : 'none'
                          }}
                        >
                          {formatPrice(price)}
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
          <strong>Formula:</strong> NewPrice = PreviousPrice + (10 × TwoWeekAvgPoints - PreviousPrice) / 4
        </p>
        <p style={{ margin: '0.25rem 0' }}>
          <span style={{ color: '#28a745' }}>Green</span> = price increased |
          <span style={{ color: '#dc3545' }}> Red</span> = price decreased |
          Week 2 uses Week 1 points only, Week 3+ uses 2-week average
        </p>
      </div>
    </Card>
  );
}
