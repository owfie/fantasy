/**
 * Empty state components for fantasy team page
 */

import { Card } from '@/components/Card';
import { DiscordLogin } from '@/components/discord-login';
import { useRouter } from 'next/navigation';

interface FantasyTeamEmptyStatesProps {
  containerClassName: string;
}

export function LoadingState({ containerClassName }: FantasyTeamEmptyStatesProps) {
  return (
    <div className={containerClassName}>
      <div>Loading...</div>
    </div>
  );
}

export function UnauthenticatedState({ containerClassName }: FantasyTeamEmptyStatesProps) {
  return (
    <div className={containerClassName}>
      <Card>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
            Sign up to manage your Fantasy team
          </h1>
          <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
            You need to be signed in to create and manage your fantasy team.
          </p>
          <DiscordLogin />
        </div>
      </Card>
    </div>
  );
}

interface NoTeamStateProps extends FantasyTeamEmptyStatesProps {
  onCreateTeam?: () => Promise<void>;
  isCreating?: boolean;
  canCreate?: boolean;
}

export function NoTeamState({ containerClassName, onCreateTeam, isCreating, canCreate }: NoTeamStateProps) {
  const router = useRouter();

  const handleCreateTeam = async () => {
    if (onCreateTeam) {
      await onCreateTeam();
    } else {
      router.push('/admin/fantasy-teams');
    }
  };

  return (
    <div className={containerClassName}>
      <Card>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
            Create Your Fantasy Team
          </h1>
          <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
            You don't have a fantasy team yet. Create one to start managing your players.
          </p>
          <button
            onClick={handleCreateTeam}
            disabled={isCreating || canCreate === false}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: (isCreating || canCreate === false) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: (isCreating || canCreate === false) ? 'not-allowed' : 'pointer',
            }}
          >
            {isCreating ? 'Creating Team...' : 'Create Team'}
          </button>
        </div>
      </Card>
    </div>
  );
}

export function NoSeasonState({ containerClassName }: FantasyTeamEmptyStatesProps) {
  return (
    <div className={containerClassName}>
      <h1>Fantasy Teams</h1>
      <p>No active season found. Please create a season first.</p>
    </div>
  );
}

export function NoWeekState({ containerClassName }: FantasyTeamEmptyStatesProps) {
  return (
    <div className={containerClassName}>
      <h1>My Fantasy Team</h1>
      <p>No weeks available for this season.</p>
    </div>
  );
}

