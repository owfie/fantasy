import { notFound } from 'next/navigation';
import { getTeamBySlug } from '@/lib/api/teams.api';
import { getPlayers } from '@/lib/api/players.api';
import TeamDetailModal from './TeamDetailModal';

interface InterceptingTeamPageProps {
  params: Promise<{ slug: string }>;
}

export default async function InterceptingTeamPage({ params }: InterceptingTeamPageProps) {
  const { slug } = await params;

  const team = await getTeamBySlug(slug);

  if (!team) {
    notFound();
  }

  // Get players on this team
  const allPlayers = await getPlayers();
  const teamPlayers = allPlayers.filter(
    (player) => player.team_id === team.id && player.is_active
  );

  return <TeamDetailModal team={team} players={teamPlayers} />;
}
