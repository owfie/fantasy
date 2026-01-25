/**
 * Teams API - Server Actions
 * Thin adapter layer between query hooks and domain services
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';
import { TeamsService } from '@/lib/domain/services';
import { InsertTeam, UpdateTeam, Team } from '@/lib/domain/types';

export async function getTeams(): Promise<Team[]> {
  const uow = await getUnitOfWork();
  const service = new TeamsService(uow);
  return uow.execute(async () => {
    return await service.findAll();
  });
}

export async function getTeam(id: string): Promise<Team | null> {
  const uow = await getUnitOfWork();
  const service = new TeamsService(uow);
  return uow.execute(async () => {
    return await service.findById(id);
  });
}

export async function createTeam(teamData: InsertTeam): Promise<Team> {
  const uow = await getUnitOfWork();
  const service = new TeamsService(uow);
  return uow.execute(async () => {
    return await service.create(teamData);
  });
}

export async function updateTeam(teamData: UpdateTeam): Promise<Team> {
  const uow = await getUnitOfWork();
  const service = new TeamsService(uow);
  return uow.execute(async () => {
    return await service.update(teamData);
  });
}

export async function deleteTeam(teamId: string): Promise<void> {
  const uow = await getUnitOfWork();
  const service = new TeamsService(uow);
  return uow.execute(async () => {
    return await service.deleteHard(teamId);
  });
}

/**
 * Get a team by slug
 * Checks team.slug field first, then generates slug from team.name
 */
export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const { generateSlug } = await import('@/lib/utils/slug');
  const uow = await getUnitOfWork();
  const service = new TeamsService(uow);

  return uow.execute(async () => {
    const allTeams = await service.findAll();

    for (const team of allTeams) {
      // Check if team has a slug field that matches
      if (team.slug === slug) {
        return team;
      }
      // Otherwise generate slug from name
      const generatedSlug = generateSlug(team.name);
      if (generatedSlug === slug) {
        return team;
      }
    }

    return null;
  });
}

