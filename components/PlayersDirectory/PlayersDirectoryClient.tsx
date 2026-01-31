'use client';

import { useState, useMemo } from 'react';
import { PlayerWithPrices } from '@/lib/domain/repositories/value-changes.repository';
import { SegmentedController } from '@/components/SegmentedController';
import { PlayerDirectoryCard } from './PlayerDirectoryCard';
import styles from './PlayersDirectory.module.scss';
import { Card } from '../Card';

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'team' | 'value-high' | 'value-low';

interface PlayersDirectoryClientProps {
  players: PlayerWithPrices[];
}

export function PlayersDirectoryClient({ players }: PlayersDirectoryClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('value-high');

  const viewOptions = [
    { id: 'grid' as ViewMode, label: 'Grid' },
    { id: 'list' as ViewMode, label: 'List' },
  ];

  const filteredAndSortedPlayers = useMemo(() => {
    let result = [...players];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(player => {
        const fullName = `${player.first_name} ${player.last_name}`.toLowerCase();
        const teamName = (player.team_name || '').toLowerCase();
        return fullName.includes(query) || teamName.includes(query);
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
          return nameA.localeCompare(nameB);

        case 'team':
          const teamA = (a.team_name || '').toLowerCase();
          const teamB = (b.team_name || '').toLowerCase();
          if (teamA !== teamB) {
            return teamA.localeCompare(teamB);
          }
          // Secondary sort by name within same team
          const nameATeam = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameBTeam = `${b.first_name} ${b.last_name}`.toLowerCase();
          return nameATeam.localeCompare(nameBTeam);

        case 'value-high':
          if (b.current_value !== a.current_value) {
            return b.current_value - a.current_value;
          }
          const nameAHigh = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameBHigh = `${b.first_name} ${b.last_name}`.toLowerCase();
          return nameAHigh.localeCompare(nameBHigh);

        case 'value-low':
          if (a.current_value !== b.current_value) {
            return a.current_value - b.current_value;
          }
          const nameALow = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameBLow = `${b.first_name} ${b.last_name}`.toLowerCase();
          return nameALow.localeCompare(nameBLow);

        default:
          return 0;
      }
    });

    return result;
  }, [players, searchQuery, sortBy]);

  return (
    <div className={styles.container}>
      <h2>Players</h2>

      <Card className={styles.header}>
        <div className={styles.controls}>
          <div className={styles.searchSection}>
            <label className={styles.filterLabel} htmlFor="search-input">
              Search
            </label>
            <input
              id="search-input"
              type="text"
              placeholder="Search by name or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.sortSection}>
            <label className={styles.filterLabel} htmlFor="sort-select">
              Sort by
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={styles.sortSelect}
            >
              <option value="value-high">Value (highest)</option>
              <option value="value-low">Value (lowest)</option>
              <option value="name">Name (A-Z)</option>
              <option value="team">Team</option>
            </select>
          </div>

          <div className={styles.viewToggle}>
            <SegmentedController
              options={viewOptions}
              selectedValues={[viewMode]}
              onChange={(values) => setViewMode(values[0] as ViewMode || 'grid')}
              allowMultiple={false}
            />
          </div>
        </div>

      </Card>

      <div className={styles.playerCount}>
        {filteredAndSortedPlayers.length} player{filteredAndSortedPlayers.length !== 1 ? 's' : ''}
      </div>

      {filteredAndSortedPlayers.length === 0 ? (
        <div className={styles.empty}>
          No players found
        </div>
      ) : (
        <div className={viewMode === 'grid' ? styles.grid : styles.list}>
          {filteredAndSortedPlayers.map((player) => (
            <PlayerDirectoryCard
              key={player.player_id}
              player={player}
              variant={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
