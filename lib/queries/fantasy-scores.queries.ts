/**
 * TanStack Query hooks for Fantasy Scores
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  calculateWeekScore,
  calculateAndSaveWeekScore,
  recalculateFromWeek,
} from '@/lib/api/fantasy-scores.api';

export const scoreKeys = {
  all: ['scores'] as const,
  byWeek: (teamId: string, weekId: string) => [...scoreKeys.all, 'team', teamId, 'week', weekId] as const,
};

export function useWeekScore(fantasyTeamId: string, weekId: string) {
  return useQuery({
    queryKey: scoreKeys.byWeek(fantasyTeamId, weekId),
    queryFn: () => calculateWeekScore(fantasyTeamId, weekId),
    enabled: !!fantasyTeamId && !!weekId,
  });
}

export function useCalculateAndSaveScore() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fantasyTeamId, weekId }: { fantasyTeamId: string; weekId: string }) =>
      calculateAndSaveWeekScore(fantasyTeamId, weekId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: scoreKeys.byWeek(variables.fantasyTeamId, variables.weekId) });
      toast.success('Score calculated and saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to calculate score: ${error.message}`);
    },
  });
}

export function useRecalculateFromWeek() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fantasyTeamId, fromWeekId }: { fantasyTeamId: string; fromWeekId: string }) =>
      recalculateFromWeek(fantasyTeamId, fromWeekId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scoreKeys.all });
      toast.success('Scores recalculated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to recalculate scores: ${error.message}`);
    },
  });
}

