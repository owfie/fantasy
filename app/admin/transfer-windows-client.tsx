'use client';

import { useState } from 'react';
import { useWeeks, useUpdateWeek } from '@/lib/queries/seasons.queries';
import { useTransfersBySeason } from '@/lib/queries/transfers.queries';
import { Week, Transfer } from '@/lib/domain/types';
import { Card } from '@/components/Card';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface TransferWindowsClientProps {
  seasonId: string | undefined;
}

export default function TransferWindowsClient({ seasonId }: TransferWindowsClientProps) {
  const { data: weeks = [], isLoading } = useWeeks(seasonId || '');
  const { data: allTransfers = [] } = useTransfersBySeason(seasonId || '');
  const updateWeekMutation = useUpdateWeek();
  const queryClient = useQueryClient();
  const [editingCutoff, setEditingCutoff] = useState<{ weekId: string; value: string } | null>(null);

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

  const handleToggleWindow = async (week: Week) => {
    try {
      await updateWeekMutation.mutateAsync({
        id: week.id,
        transfer_window_open: !week.transfer_window_open,
      });
      queryClient.invalidateQueries({ queryKey: ['seasons', 'weeks', seasonId] });
      toast.success(`Transfer window ${!week.transfer_window_open ? 'opened' : 'closed'} for ${week.name || `Week ${week.week_number}`}`);
    } catch (error) {
      toast.error('Failed to update transfer window');
    }
  };

  const handleCutoffTimeChange = async (weekId: string, newValue: string) => {
    try {
      const cutoffDate = newValue ? new Date(newValue) : null;
      await updateWeekMutation.mutateAsync({
        id: weekId,
        transfer_cutoff_time: cutoffDate ? cutoffDate.toISOString() : undefined,
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

  const getWeekStatus = (week: Week) => {
    const gameDate = week.start_date || week.end_date;
    const cutoffTime = week.transfer_cutoff_time ? new Date(week.transfer_cutoff_time) : null;
    const isPast = gameDate ? new Date(gameDate) < now : false;
    const cutoffPassed = cutoffTime ? cutoffTime < now : false;
    
    return {
      isPast,
      cutoffPassed,
      isUpcoming: !isPast,
      hasCutoff: !!cutoffTime,
    };
  };

  return (
    <Card>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Transfer Windows Timeline</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          Manage transfer windows for each week. Toggle windows open/closed and set cutoff times.
        </p>
      </div>

      {sortedWeeks.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          No weeks configured for this season
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {sortedWeeks.map((week, index) => {
            const status = getWeekStatus(week);
            const gameDate = week.start_date || week.end_date;
            const cutoffTime = week.transfer_cutoff_time ? new Date(week.transfer_cutoff_time) : null;
            
            return (
              <div
                key={week.id}
                style={{
                  position: 'relative',
                  paddingLeft: '3rem',
                  paddingBottom: index < sortedWeeks.length - 1 ? '2rem' : '0',
                }}
              >
                {/* Timeline line */}
                {index < sortedWeeks.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '1.25rem',
                      top: '2.5rem',
                      bottom: '-1.5rem',
                      width: '2px',
                      background: '#e5e7eb',
                    }}
                  />
                )}

                {/* Timeline dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '0.5rem',
                    width: '1rem',
                    height: '1rem',
                    borderRadius: '50%',
                    background: week.transfer_window_open ? '#10b981' : status.isPast ? '#9ca3af' : '#ef4444',
                    border: '3px solid white',
                    boxShadow: '0 0 0 2px #e5e7eb',
                    zIndex: 1,
                  }}
                />

                {/* Week card */}
                <div
                  style={{
                    background: 'white',
                    border: `2px solid ${week.transfer_window_open ? '#10b981' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    padding: '1.25rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  {/* Week header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                          {week.name || `Week ${week.week_number}`}
                        </h3>
                        {week.is_draft_week && (
                          <span style={{ fontSize: '0.75rem', background: '#6366f1', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            DRAFT
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                        {gameDate && (
                          <div>
                            <strong>Game Date:</strong> {new Date(gameDate).toLocaleDateString(undefined, {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Transfer window toggle */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleToggleWindow(week)}
                        disabled={updateWeekMutation.isPending}
                        style={{
                          padding: '0.5rem 1rem',
                          background: week.transfer_window_open ? '#10b981' : '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: updateWeekMutation.isPending ? 'not-allowed' : 'pointer',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          opacity: updateWeekMutation.isPending ? 0.6 : 1,
                          transition: 'opacity 0.2s',
                        }}
                      >
                        {week.transfer_window_open ? (
                          <>
                            <span>✓</span> Window Open
                          </>
                        ) : (
                          <>
                            <span>✗</span> Window Closed
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Cutoff time section */}
                  <div
                    style={{
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                          Transfer Cutoff Time
                        </label>
                        {editingCutoff?.weekId === week.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="datetime-local"
                              value={editingCutoff.value}
                              onChange={(e) => setEditingCutoff({ weekId: week.id, value: e.target.value })}
                              style={{
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                                flex: 1,
                              }}
                            />
                            <button
                              onClick={() => handleCutoffTimeChange(week.id, editingCutoff.value)}
                              disabled={updateWeekMutation.isPending}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: updateWeekMutation.isPending ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                                opacity: updateWeekMutation.isPending ? 0.6 : 1,
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCutoff(null)}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              {cutoffTime ? (
                                <div style={{ fontSize: '0.9rem', color: '#374151' }}>
                                  <div style={{ fontWeight: '500' }}>
                                    {cutoffTime.toLocaleString(undefined, {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true,
                                    })}
                                  </div>
                                  {status.cutoffPassed && (
                                    <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                      ⚠️ Cutoff has passed
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic' }}>
                                  No cutoff time set
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const currentValue = cutoffTime
                                  ? new Date(cutoffTime).toISOString().slice(0, 16)
                                  : gameDate
                                    ? `${gameDate}T18:00`
                                    : '';
                                setEditingCutoff({ weekId: week.id, value: currentValue });
                              }}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                              }}
                            >
                              {cutoffTime ? 'Edit' : 'Set Cutoff'}
                            </button>
                          </div>
                        )}
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem', margin: 0 }}>
                          Default: 6pm on game day. Transfers lock at this time.
                        </p>
                      </div>

                      {/* Status indicators */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '150px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.isUpcoming ? '#10b981' : '#9ca3af' }} />
                            {status.isUpcoming ? 'Upcoming' : 'Past'}
                          </div>
                        </div>
                        {week.transfer_window_open && (
                          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '500' }}>
                            ✓ Transfers allowed
                          </div>
                        )}
                        {!week.transfer_window_open && status.isUpcoming && (
                          <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '500' }}>
                            ✗ Transfers locked
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transfer Events */}
                  {transfersByWeek.has(week.id) && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: '#f0f9ff',
                        borderRadius: '6px',
                        border: '1px solid #bae6fd',
                      }}
                    >
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#0369a1' }}>
                        Transfer Events ({transfersByWeek.get(week.id)?.length || 0})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {transfersByWeek.get(week.id)?.map((transfer) => (
                          <div
                            key={transfer.id}
                            style={{
                              padding: '0.5rem',
                              background: 'white',
                              borderRadius: '4px',
                              border: '1px solid #bae6fd',
                              fontSize: '0.8rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div style={{ color: '#0369a1' }}>
                              <span style={{ fontWeight: '500' }}>Transfer</span>
                              {transfer.net_transfer_value !== 0 && (
                                <span style={{ marginLeft: '0.5rem', color: transfer.net_transfer_value > 0 ? '#ef4444' : '#10b981' }}>
                                  ({transfer.net_transfer_value > 0 ? '+' : ''}${transfer.net_transfer_value.toFixed(2)})
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {new Date(transfer.created_at).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

