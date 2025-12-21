/**
 * Teams page using TanStack Query
 * Demonstrates reactive data fetching and caching
 */

'use client';

import { useTeams } from '@/lib/queries/teams.queries';

export default function TeamsPage() {
  const { data: teams, isLoading, error } = useTeams();

  if (isLoading) {
    return (
      <div>
        <h1>Teams</h1>
        <p>Loading teams...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>Teams</h1>
        <p style={{ color: 'red' }}>
          Error loading teams: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>Teams</h1>
      <ul>
        {teams?.map((team) => (
          <li key={team.id}>
            {team.name} {team.color && <span style={{ color: team.color }}>●</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
