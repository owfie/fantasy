/**
 * Zustand store for filter state
 * Manages client-side filter/search state
 */

import { create } from 'zustand';

interface TeamFilters {
  includeDeleted: boolean;
  searchTerm: string;
}

interface FiltersStore {
  teamFilters: TeamFilters;
  setTeamFilters: (filters: Partial<TeamFilters>) => void;
  resetTeamFilters: () => void;
}

const defaultTeamFilters: TeamFilters = {
  includeDeleted: false,
  searchTerm: '',
};

export const useFiltersStore = create<FiltersStore>((set, get) => ({
  teamFilters: defaultTeamFilters,
  setTeamFilters: (filters) => {
    set((state) => ({
      teamFilters: { ...state.teamFilters, ...filters },
    }));
  },
  resetTeamFilters: () => {
    set({ teamFilters: defaultTeamFilters });
  },
}));

