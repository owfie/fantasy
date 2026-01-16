'use client';

import { useState, memo } from 'react';
import { PlayerWithValue } from '@/lib/api/players.api';
import { FantasyPosition } from '@/lib/domain/types';
import { Card } from '@/components/Card';
import { PlayerCard } from './PlayerCard';
import { PlayerCardSkeleton } from './PlayerCardSkeleton';
import { SegmentedController } from '@/components/SegmentedController';
import styles from './PlayerList.module.scss';

interface PlayerListProps {
  players: PlayerWithValue[];
  onAddPlayer?: (playerId: string) => void;
  onSwapPlayer?: (playerId: string) => void;
  teamPlayerIds?: Set<string>;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isLoading?: boolean;
  isPositionFull?: (position: FantasyPosition) => boolean;
}

const ALL_POSITIONS: FantasyPosition[] = ['handler', 'cutter', 'receiver'];
type PositionFilter = FantasyPosition | 'all';

export const PlayerList = memo(function PlayerList({
  players,
  onAddPlayer,
  onSwapPlayer,
  teamPlayerIds = new Set(),
  searchQuery = '',
  onSearchChange,
  isLoading = false,
  isPositionFull,
}: PlayerListProps) {
  type SortOption = 'price-high' | 'price-low' | 'draft-order' | 'points' | 'name' | 'team';
  const [sortBy, setSortBy] = useState<SortOption>('price-high');
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');

  const positionOptions: { id: PositionFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    ...ALL_POSITIONS.map(position => ({
      id: position as PositionFilter,
      label: `${position.charAt(0).toUpperCase() + position.slice(1)}s`,
    })),
  ];

  const filteredPlayers = players.filter(player => {
    // Position filter: if 'all' selected, show all; otherwise match the specific position
    if (positionFilter !== 'all' && player.position && player.position !== positionFilter) {
      return false;
    }
    if (searchQuery) {
      const fullName = `${player.first_name} ${player.last_name}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    switch (sortBy) {
      case 'price-high':
        // Sort by price high to low, then by name
        if (b.currentValue !== a.currentValue) {
          return b.currentValue - a.currentValue;
        }
        const nameA_high = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB_high = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA_high.localeCompare(nameB_high);

      case 'price-low':
        // Sort by price low to high, then by name
        if (a.currentValue !== b.currentValue) {
          return a.currentValue - b.currentValue;
        }
        const nameA_low = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB_low = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA_low.localeCompare(nameB_low);

      case 'draft-order':
        // Sort by draft order (lower number first), then by name
        const draftOrderA = a.draft_order ?? Infinity;
        const draftOrderB = b.draft_order ?? Infinity;
        if (draftOrderA !== draftOrderB) {
          return draftOrderA - draftOrderB;
        }
        const nameA_draft = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB_draft = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA_draft.localeCompare(nameB_draft);

      case 'points':
        // Sort by total points (high to low), then by name
        const pointsA = a.points ?? 0;
        const pointsB = b.points ?? 0;
        if (pointsB !== pointsA) {
          return pointsB - pointsA;
        }
        const nameA_points = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB_points = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA_points.localeCompare(nameB_points);

      case 'name':
        // Sort A-Z
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);

      case 'team':
        // Sort by team, then by name within team
        const teamA = a.teamName || '';
        const teamB = b.teamName || '';
        if (teamA !== teamB) {
          return teamA.localeCompare(teamB);
        }
        const nameA_team = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB_team = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA_team.localeCompare(nameB_team);

      default:
        return 0;
    }
  });

  return (
      <div className={styles.playerList}>
        <h2 className={styles.title}>Players</h2>

        <Card className={styles.filtersCard}>
            {/* Search Section */}
            <div className={styles.searchSection}>
                <label className={styles.filterLabel} htmlFor="search-input">Filter by name</label>
                <input
                    id="search-input"
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {/* Sort Section */}
            <div className={styles.sortSection}>
                <label className={styles.filterLabel} htmlFor="sort-select">Sort by</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className={styles.sortSelect}
                >
                  <option value="price-high">Price (highest)</option>
                  <option value="price-low">Price (lowest)</option>
                  <option value="draft-order">Pick order</option>
                  <option value="points">Points</option>
                  <option value="name">Name</option>
                  <option value="team">Team</option>
                </select>
            </div>
        </Card>

        {/* Position Tabs */}
        <div className={styles.positionsSection}>
          <SegmentedController
            options={positionOptions}
            selectedValues={[positionFilter]}
            onChange={(values) => setPositionFilter(values[0] as PositionFilter || 'all')}
            allowMultiple={false}
          />
        </div>

        <div className={styles.playersContainer}>
        {isLoading ? (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <PlayerCardSkeleton key={`skeleton-${i}`} />
            ))}
          </>
        ) : sortedPlayers.length === 0 ? (
          <div className={styles.empty}>No players found</div>
        ) : (
          sortedPlayers.map(player => {
            const position = player.position as FantasyPosition | undefined;
            const canAdd = position ? (isPositionFull ? !isPositionFull(position) : true) : true;
            
            return (
              <PlayerCard
                key={player.id}
                player={player}
                onAdd={onAddPlayer}
                onSwap={onSwapPlayer}
                canAdd={canAdd}
                isOnTeam={teamPlayerIds.has(player.id)}
                layoutId={`player-${player.id}`}
              />
            );
          })
        )}
      </div>
      </div>

  );
});

