/**
 * TanStack Query hooks for Test Dashboard
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { getTestDashboardData, TestDashboardData, getAdminDashboardData, AdminDashboardData } from '@/lib/api';

export const testKeys = {
  all: ['test'] as const,
  dashboard: () => [...testKeys.all, 'dashboard'] as const,
  adminDashboard: () => [...testKeys.all, 'adminDashboard'] as const,
};

/**
 * Query hook to fetch test dashboard data
 */
export function useTestDashboard() {
  return useQuery<TestDashboardData>({
    queryKey: testKeys.dashboard(),
    queryFn: () => getTestDashboardData(),
    staleTime: 10 * 1000, // 10 seconds - test data can be slightly stale
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Query hook to fetch admin dashboard data
 */
export function useAdminDashboard() {
  return useQuery<AdminDashboardData>({
    queryKey: testKeys.adminDashboard(),
    queryFn: () => getAdminDashboardData(),
    staleTime: 5 * 1000, // 5 seconds
    gcTime: 1 * 60 * 1000, // 1 minute
  });
}

