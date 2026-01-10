'use client';

import { useState } from 'react';
import { PlayerWithValue } from '@/lib/api/players.api';
import { FantasyPosition } from '@/lib/domain/types';
import { Card } from '@/components/Card';
import { PlayerCard } from './PlayerCard';
import styles from './PlayerList.module.scss';

interface PlayerListProps {
  players: PlayerWithValue[];
  selectedPositions: FantasyPosition[];
  onPositionChange: (positions: FantasyPosition[]) => void;
  onAddPlayer?: (playerId: string) => void;
  teamPlayerIds?: Set<string>;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const ALL_POSITIONS: FantasyPosition[] = ['handler', 'cutter', 'receiver'];

export function PlayerList({
  players,
  selectedPositions,
  onPositionChange,
  onAddPlayer,
  teamPlayerIds = new Set(),
  searchQuery = '',
  onSearchChange,
}: PlayerListProps) {
  type SortOption = 'price-high' | 'price-low' | 'draft-order' | 'points' | 'name' | 'team';
  const [sortBy, setSortBy] = useState<SortOption>('price-high');

  const handlePositionToggle = (position: FantasyPosition) => {
    if (selectedPositions.includes(position)) {
      // If this position is already selected and we have more than one, remove it
      if (selectedPositions.length > 1) {
        onPositionChange(selectedPositions.filter(p => p !== position));
      }
      // If it's the only one selected, don't allow unchecking (must have at least one)
    } else {
      // Add this position
      onPositionChange([...selectedPositions, position]);
    }
  };

  const filteredPlayers = players.filter(player => {
    // Position filter: must match one of selected positions (AND logic - all selected means show all)
    if (player.position && !selectedPositions.includes(player.position)) {
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
    <Card style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.playerList}>
        <h2 className={styles.title}>Players</h2>
      
        {/* Filters Section */}
        <div className={styles.filtersSection}>
          <label className={styles.filterLabel}>Filters</label>
          <div className={styles.positionFilters}>
            {ALL_POSITIONS.map(position => (
              <label key={position} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedPositions.includes(position)}
                  onChange={() => handlePositionToggle(position)}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>
                  {position.charAt(0).toUpperCase() + position.slice(1)}s
                </span>
              </label>
            ))}
          </div>
          
          <div className={styles.sortSection}>
            <label className={styles.filterLabel} htmlFor="sort-select">Sort</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={styles.sortSelect}
            >
              <option value="price-high">Price (High to Low)</option>
              <option value="price-low">Price (Low to High)</option>
              <option value="draft-order">Draft Order</option>
              <option value="points">Total Points</option>
              <option value="name">Sort A-Z</option>
              <option value="team">Sort by Team</option>
            </select>
          </div>
        </div>

        {/* Search Section */}
        <div className={styles.searchSection}>
          <label className={styles.filterLabel} htmlFor="search-input">Filter by name</label>
          <input
            id="search-input"
            type="text"
            placeholder="Search by name"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className={styles.searchInput}
          />
        </div>

      <div className={styles.headerRow}>
        <span className={styles.valueHeader}>Value</span>
        <span className={styles.pointsHeader}>Points</span>
      </div>

      <div className={styles.playersContainer}>
        {sortedPlayers.length === 0 ? (
          <div className={styles.empty}>No players found</div>
        ) : (
          sortedPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onAdd={onAddPlayer}
              isOnTeam={teamPlayerIds.has(player.id)}
            />
          ))
        )}
      </div>
      </div>
    </Card>
  );
}

