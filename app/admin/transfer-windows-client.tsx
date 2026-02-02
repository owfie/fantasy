'use client';

import { useState } from 'react';
import { useWeeks, useUpdateWeek } from '@/lib/queries/seasons.queries';
import { useTransfersBySeason } from '@/lib/queries/transfers.queries';
import { useOpenTransferWindow, useCloseTransferWindow, useTransferWindowStatuses } from '@/lib/queries/price-calculation.queries';
import { Week, Transfer, getTransferWindowState, TransferWindowState } from '@/lib/domain/types';
import { Card } from '@/components/Card';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { utcToLocalDatetimeInput, localDatetimeInputToUtc } from '@/lib/utils/date-utils';

type TimelineItemType = 'transfer-window' | 'game-week';

interface TransferWindowItem {
  type: 'transfer-window';
  windowNumber: number;
  requiresWeekNumber: number | null; // null for TW0 (no prior week needed)
  week: Week; // The week this TW is associated with
  state: TransferWindowState;
  hasRequiredStats: boolean;
  pricesCalculated: boolean;
}

interface GameWeekItem {
  type: 'game-week';
  weekNumber: number;
  week: Week;
  hasStats: boolean;
  pricesCalculated: boolean;
}

type TimelineItem = TransferWindowItem | GameWeekItem;

/**
 * Get color scheme for transfer window state
 */
function getTWStateColors(state: TransferWindowState): { bg: string; border: string; text: string; badge: string } {
  switch (state) {
    case 'open':
      return { bg: '#ecfdf5', border: '#10b981', text: '#065f46', badge: '#10b981' }; // Green
    case 'ready':
      return { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', badge: '#f59e0b' }; // Yellow
    case 'completed':
      return { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', badge: '#3b82f6' }; // Blue
    case 'upcoming':
      return { bg: '#f9fafb', border: '#d1d5db', text: '#6b7280', badge: '#9ca3af' }; // Gray
    default:
      return { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280', badge: '#9ca3af' };
  }
}

/**
 * Get color scheme for game week based on completion status
 */
function getWeekStateColors(hasStats: boolean, pricesCalculated: boolean): { bg: string; border: string; text: string; badge: string } {
  if (pricesCalculated) {
    return { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '#22c55e' }; // Green - complete
  }
  if (hasStats) {
    return { bg: '#fefce8', border: '#fde047', text: '#854d0e', badge: '#eab308' }; // Yellow - partial
  }
  return { bg: '#f8fafc', border: '#cbd5e1', text: '#475569', badge: '#94a3b8' }; // Gray - pending
}

/**
 * Get display text for transfer window state
 */
function getTWStateLabel(state: TransferWindowState): string {
  switch (state) {
    case 'open':
      return 'Open';
    case 'ready':
      return 'Ready';
    case 'completed':
      return 'Completed';
    case 'upcoming':
      return 'Upcoming';
    default:
      return 'Unknown';
  }
}

interface TransferWindowsClientProps {
  seasonId: string | undefined;
}

export default function TransferWindowsClient({ seasonId }: TransferWindowsClientProps) {
  const { data: weeks = [], isLoading } = useWeeks(seasonId || '');
  const { data: allTransfers = [] } = useTransfersBySeason(seasonId || '');
  const { data: windowStatuses = [] } = useTransferWindowStatuses(seasonId);
  const updateWeekMutation = useUpdateWeek();
  const openWindowMutation = useOpenTransferWindow();
  const closeWindowMutation = useCloseTransferWindow();
  const queryClient = useQueryClient();
  const [editingCutoff, setEditingCutoff] = useState<{ weekId: string; value: string } | null>(null);

  // Build status map for quick lookup
  const statusMap = new Map(windowStatuses.map(s => [s.windowNumber, s]));

  if (!seasonId) {
    return (
      <Card>
        <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
          Please select a season to view transfer windows
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>Loading weeks...</p>
      </Card>
    );
  }

  const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number);
  const now = new Date();

  // Find if there's already an open window
  const openWindow = sortedWeeks.find(w => w.transfer_window_open);

  // Build timeline items - interleave transfer windows and game weeks
  const timelineItems: TimelineItem[] = [];

  for (const week of sortedWeeks) {
    const status = statusMap.get(week.week_number);
    const hasStats = status?.hasRequiredStats ?? false;

    // For TW_n (window before week n+1), we need week n's prices
    // TW0 is the window before week 1 - no prior week needed
    // TW1 is the window before week 2 - needs week 1's prices
    // So for week.week_number = 1, the TW before it (TW0) requires null
    // For week.week_number = 2, the TW before it (TW1) requires week 1's prices

    // First, add the transfer window that comes BEFORE this game week
    // TW_n comes before Week n+1, so TW for week.week_number is TWn where n = week.week_number - 1
    const twNumber = week.week_number - 1;
    const requiresWeekNumber = twNumber === 0 ? null : twNumber; // TW0 requires nothing, TW1 requires week 1, etc.

    // Calculate TW state based on the PREVIOUS week's prices (not current week)
    let twPricesReady = true;
    if (requiresWeekNumber !== null) {
      const requiredWeek = sortedWeeks.find(w => w.week_number === requiresWeekNumber);
      twPricesReady = requiredWeek?.prices_calculated ?? false;
    }

    const twState = getTransferWindowState(
      twPricesReady, // For TW, "prices calculated" means the required previous week has prices
      week.transfer_window_open,
      week.transfer_cutoff_time,
      week.transfer_window_closed_at,
      week.end_date
    );

    timelineItems.push({
      type: 'transfer-window',
      windowNumber: twNumber,
      requiresWeekNumber,
      week,
      state: twState,
      hasRequiredStats: requiresWeekNumber === null || (sortedWeeks.find(w => w.week_number === requiresWeekNumber)?.prices_calculated ?? false),
      pricesCalculated: twPricesReady,
    });

    // Then add the game week itself
    timelineItems.push({
      type: 'game-week',
      weekNumber: week.week_number,
      week,
      hasStats,
      pricesCalculated: week.prices_calculated,
    });
  }

  const handleOpenWindow = async (week: Week, twItem: TransferWindowItem) => {
    // Validation: Check if required previous week has prices
    if (!twItem.hasRequiredStats) {
      const reqWeek = twItem.requiresWeekNumber;
      toast.error(`Cannot open window: Week ${reqWeek} prices have not been calculated yet.`);
      return;
    }

    // Validation: Check if another window is open
    if (openWindow && openWindow.id !== week.id) {
      const openTWNumber = openWindow.week_number - 1;
      toast.error(`Cannot open window: TW${openTWNumber} is already open. Close it first.`);
      return;
    }

    await openWindowMutation.mutateAsync(week.id);
  };

  const handleCloseWindow = async (week: Week) => {
    await closeWindowMutation.mutateAsync(week.id);
  };

  const handleCutoffTimeChange = async (weekId: string, newValue: string) => {
    try {
      await updateWeekMutation.mutateAsync({
        id: weekId,
        transfer_cutoff_time: newValue ? localDatetimeInputToUtc(newValue) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['seasons', 'weeks', seasonId] });
      setEditingCutoff(null);
      toast.success('Cutoff time updated');
    } catch (error) {
      toast.error('Failed to update cutoff time');
    }
  };

  // Group transfers by week
  const transfersByWeek = new Map<string, Transfer[]>();
  allTransfers.forEach((transfer: Transfer) => {
    if (transfer.week_id) {
      const existing = transfersByWeek.get(transfer.week_id) || [];
      transfersByWeek.set(transfer.week_id, [...existing, transfer]);
    }
  });

  const isOperationPending = openWindowMutation.isPending || closeWindowMutation.isPending;

  return (
    <Card>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Transfer Windows Timeline</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Manage transfer windows and track game week progress. Only one window can be open at a time.
        </p>

        {/* Legend */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '0.75rem 1rem',
          fontSize: '0.8rem',
          color: '#475569',
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: '#10b981', padding: '0.1rem 0.4rem', borderRadius: '3px', color: 'white', fontSize: '0.7rem' }}>Open</span>
            <span>Users can transfer</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: '#f59e0b', padding: '0.1rem 0.4rem', borderRadius: '3px', color: 'white', fontSize: '0.7rem' }}>Ready</span>
            <span>Can be opened</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: '#3b82f6', padding: '0.1rem 0.4rem', borderRadius: '3px', color: 'white', fontSize: '0.7rem' }}>Completed</span>
            <span>Window closed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: '#9ca3af', padding: '0.1rem 0.4rem', borderRadius: '3px', color: 'white', fontSize: '0.7rem' }}>Upcoming</span>
            <span>Awaiting stats</span>
          </div>
        </div>
      </div>

      {sortedWeeks.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          No weeks configured for this season
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {timelineItems.map((item, index) => {
            const isLastItem = index === timelineItems.length - 1;
            const nextItem = timelineItems[index + 1];
            const isCrossingTypes = nextItem && nextItem.type !== item.type;

            if (item.type === 'transfer-window') {
              return (
                <TransferWindowCard
                  key={`tw-${item.windowNumber}`}
                  item={item}
                  openWindow={openWindow}
                  isOperationPending={isOperationPending}
                  editingCutoff={editingCutoff}
                  setEditingCutoff={setEditingCutoff}
                  onOpenWindow={handleOpenWindow}
                  onCloseWindow={handleCloseWindow}
                  onCutoffTimeChange={handleCutoffTimeChange}
                  updateWeekMutation={updateWeekMutation}
                  isLastItem={isLastItem}
                  isCrossingTypes={isCrossingTypes}
                  transfersByWeek={transfersByWeek}
                />
              );
            } else {
              return (
                <GameWeekCard
                  key={`week-${item.weekNumber}`}
                  item={item}
                  isLastItem={isLastItem}
                  isCrossingTypes={isCrossingTypes}
                />
              );
            }
          })}
        </div>
      )}
    </Card>
  );
}

interface TransferWindowCardProps {
  item: TransferWindowItem;
  openWindow: Week | undefined;
  isOperationPending: boolean;
  editingCutoff: { weekId: string; value: string } | null;
  setEditingCutoff: (value: { weekId: string; value: string } | null) => void;
  onOpenWindow: (week: Week, item: TransferWindowItem) => void;
  onCloseWindow: (week: Week) => void;
  onCutoffTimeChange: (weekId: string, value: string) => void;
  updateWeekMutation: { isPending: boolean };
  isLastItem: boolean;
  isCrossingTypes: boolean;
  transfersByWeek: Map<string, Transfer[]>;
}

function TransferWindowCard({
  item,
  openWindow,
  isOperationPending,
  editingCutoff,
  setEditingCutoff,
  onOpenWindow,
  onCloseWindow,
  onCutoffTimeChange,
  updateWeekMutation,
  isLastItem,
  isCrossingTypes,
  transfersByWeek,
}: TransferWindowCardProps) {
  const { week, windowNumber, requiresWeekNumber, state, hasRequiredStats } = item;
  const colors = getTWStateColors(state);
  const stateLabel = getTWStateLabel(state);

  const canOpen = hasRequiredStats && !week.transfer_window_open && (!openWindow || openWindow.id === week.id);
  const cutoffTime = week.transfer_cutoff_time ? new Date(week.transfer_cutoff_time) : null;
  const gameDate = week.start_date || week.end_date;

  // Get the week that this TW precedes (week.week_number)
  const precedesWeek = week.week_number;

  return (
    <div
      style={{
        position: 'relative',
        paddingLeft: '3rem',
        paddingBottom: isLastItem ? '0' : '0.5rem',
      }}
    >
      {/* Timeline line */}
      {!isLastItem && (
        <div
          style={{
            position: 'absolute',
            left: '1.25rem',
            top: '2.5rem',
            bottom: '-0.5rem',
            width: '2px',
            background: isCrossingTypes ? '#d1d5db' : '#e5e7eb',
            borderStyle: isCrossingTypes ? 'dashed' : 'solid',
          }}
        />
      )}

      {/* Timeline dot - diamond for transfer windows */}
      <div
        style={{
          position: 'absolute',
          left: '0.65rem',
          top: '0.6rem',
          width: '1.2rem',
          height: '1.2rem',
          background: colors.badge,
          border: '3px solid white',
          boxShadow: '0 0 0 2px #e5e7eb',
          zIndex: 1,
          transform: 'rotate(45deg)',
        }}
      />

      {/* Card */}
      <div
        style={{
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: colors.text }}>
                TW{windowNumber} - Transfer Window
              </h3>
              <span style={{
                fontSize: '0.7rem',
                background: colors.badge,
                color: 'white',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                fontWeight: '500',
              }}>
                {stateLabel}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              Before Week {precedesWeek} games
              {requiresWeekNumber !== null && (
                <span style={{ marginLeft: '0.5rem' }}>
                  • Requires: Week {requiresWeekNumber} prices {hasRequiredStats ? '✓' : '○'}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            {week.transfer_window_open ? (
              <button
                onClick={() => onCloseWindow(week)}
                disabled={isOperationPending}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isOperationPending ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                  opacity: isOperationPending ? 0.6 : 1,
                }}
              >
                Close Window
              </button>
            ) : state !== 'completed' ? (
              <button
                onClick={() => onOpenWindow(week, item)}
                disabled={isOperationPending || !canOpen}
                title={
                  !hasRequiredStats
                    ? `Week ${requiresWeekNumber} prices not yet calculated`
                    : openWindow && openWindow.id !== week.id
                      ? `TW${openWindow.week_number - 1} is already open`
                      : 'Open transfer window'
                }
                style={{
                  padding: '0.4rem 0.8rem',
                  background: canOpen ? '#10b981' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isOperationPending || !canOpen ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                  opacity: isOperationPending ? 0.6 : 1,
                }}
              >
                {!hasRequiredStats ? 'Awaiting Stats' : 'Open Window'}
              </button>
            ) : null}
            {!week.transfer_window_open && !canOpen && state !== 'completed' && (
              <span style={{ fontSize: '0.65rem', color: '#ef4444', maxWidth: '140px', textAlign: 'right' }}>
                {!hasRequiredStats
                  ? `Enter Week ${requiresWeekNumber} stats`
                  : openWindow && openWindow.id !== week.id
                    ? `Close TW${openWindow.week_number - 1} first`
                    : ''}
              </span>
            )}
          </div>
        </div>

        {/* Cutoff time section */}
        <div
          style={{
            padding: '0.75rem',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '6px',
            border: '1px solid rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>
                Cutoff Time
              </label>
              {editingCutoff?.weekId === week.id ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="datetime-local"
                    value={editingCutoff.value}
                    onChange={(e) => setEditingCutoff({ weekId: week.id, value: e.target.value })}
                    style={{
                      padding: '0.4rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      flex: 1,
                    }}
                  />
                  <button
                    onClick={() => onCutoffTimeChange(week.id, editingCutoff.value)}
                    disabled={updateWeekMutation.isPending}
                    style={{
                      padding: '0.4rem 0.75rem',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: updateWeekMutation.isPending ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingCutoff(null)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ flex: 1, fontSize: '0.85rem', color: '#374151' }}>
                    {cutoffTime ? (
                      cutoffTime.toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not set</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const currentValue = cutoffTime
                        ? utcToLocalDatetimeInput(cutoffTime.toISOString())
                        : gameDate
                          ? `${gameDate}T18:00`
                          : '';
                      setEditingCutoff({ weekId: week.id, value: currentValue });
                    }}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    {cutoffTime ? 'Edit' : 'Set'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transfer Events */}
        {transfersByWeek.has(week.id) && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 0.75rem',
              background: '#f0f9ff',
              borderRadius: '6px',
              border: '1px solid #bae6fd',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0369a1' }}>
              {transfersByWeek.get(week.id)?.length || 0} transfers made
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface GameWeekCardProps {
  item: GameWeekItem;
  isLastItem: boolean;
  isCrossingTypes: boolean;
}

function GameWeekCard({ item, isLastItem, isCrossingTypes }: GameWeekCardProps) {
  const { week, weekNumber, hasStats, pricesCalculated } = item;
  const colors = getWeekStateColors(hasStats, pricesCalculated);

  const gameDate = week.start_date || week.end_date;

  return (
    <div
      style={{
        position: 'relative',
        paddingLeft: '3rem',
        paddingBottom: isLastItem ? '0' : '0.5rem',
      }}
    >
      {/* Timeline line */}
      {!isLastItem && (
        <div
          style={{
            position: 'absolute',
            left: '1.25rem',
            top: '2rem',
            bottom: '-0.5rem',
            width: '2px',
            background: isCrossingTypes ? '#d1d5db' : '#e5e7eb',
            borderStyle: isCrossingTypes ? 'dashed' : 'solid',
          }}
        />
      )}

      {/* Timeline dot - circle for game weeks */}
      <div
        style={{
          position: 'absolute',
          left: '0.75rem',
          top: '0.5rem',
          width: '1rem',
          height: '1rem',
          borderRadius: '50%',
          background: colors.badge,
          border: '3px solid white',
          boxShadow: '0 0 0 2px #e5e7eb',
          zIndex: 1,
        }}
      />

      {/* Card */}
      <div
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: '6px',
          padding: '0.75rem 1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: colors.text }}>
              Week {weekNumber} - Game Week
            </h4>
            {gameDate && (
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.15rem' }}>
                {new Date(gameDate).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            )}
          </div>

          {/* Status indicators */}
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
            <div style={{ color: hasStats ? '#16a34a' : '#9ca3af' }}>
              {hasStats ? '✓' : '○'} Stats
            </div>
            <div style={{ color: pricesCalculated ? '#16a34a' : '#9ca3af' }}>
              {pricesCalculated ? '✓' : '○'} Prices
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
