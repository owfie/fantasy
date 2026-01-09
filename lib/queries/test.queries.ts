/**
 * TanStack Query hooks for Test Dashboard
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { getTestDashboardData, TestDashboardData, getAdminDashboardData, AdminDashboardData } from '@/lib/api';

export const testKeys = {
  all: ['test'] as const,
  dashboard: (seasonId?: string) => [...testKeys.all, 'dashboard', seasonId] as const,
  adminDashboard: (seasonId?: string) => [...testKeys.all, 'adminDashboard', seasonId] as const,
};

/**
 * Query hook to fetch test dashboard data (filtered by season)
 */
export function useTestDashboard(seasonId?: string) {
  return useQuery<TestDashboardData>({
    queryKey: testKeys.dashboard(seasonId),
    queryFn: () => getTestDashboardData(seasonId),
    staleTime: 10 * 1000, // 10 seconds - test data can be slightly stale
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Query hook to fetch admin dashboard data (filtered by season)
 */
export function useAdminDashboard(seasonId?: string) {
  return useQuery<AdminDashboardData>({
    queryKey: testKeys.adminDashboard(seasonId),
    queryFn: () => getAdminDashboardData(seasonId),
    staleTime: 5 * 1000, // 5 seconds
    gcTime: 1 * 60 * 1000, // 1 minute
  });
}

