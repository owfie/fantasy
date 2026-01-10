/**
 * Debug component to display roster JSON
 */

import { Card } from '@/components/Card';
import { DraftRosterPlayer } from '@/lib/utils/fantasy-team-validation';

interface DebugRosterDisplayProps {
  draftRoster: DraftRosterPlayer[];
}

export function DebugRosterDisplay({ draftRoster }: DebugRosterDisplayProps) {
  return (
    <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
      <details style={{ cursor: 'pointer' }}>
        <summary style={{ fontWeight: 600, marginBottom: '0.5rem', userSelect: 'none' }}>
          Fantasy Team JSON (Debug)
        </summary>
        <div style={{ marginTop: '0.5rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Draft Roster:
          </h4>
          <pre
            style={{
              backgroundColor: '#f3f4f6',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              overflow: 'auto',
              maxHeight: '300px',
            }}
          >
            {JSON.stringify(draftRoster, null, 2)}
          </pre>
        </div>
      </details>
    </Card>
  );
}

