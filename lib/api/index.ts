/**
 * API Layer - Server Actions
 * Centralized exports for all API endpoints
 */

export * from './teams.api';
export * from './test.api';
export * from './fixtures.api';
export * from './players.api';
export * from './seasons.api';
export { getGamesByWeek, createGame, updateGame, deleteGame } from './fixtures.api';

