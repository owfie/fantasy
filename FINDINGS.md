# Excessive API Requests Investigation - Findings

## Problem Summary
The `/fantasy` route triggers ~9 recompiles/rerenders on reload, leading to excessive API requests (10,000+ requests in 60 minutes). The network tab shows `test.api.ts:1035` (`testGetAllFantasyTeams`) as the initiator of bulk requests.

## Key Observations

### 1. Multiple Hook Calls
- `useFantasyTeamData` is called **twice** in `FantasyPage`: once with `(null, null)` and once with `(selectedTeamId, selectedWeekId)`
- Each call internally calls `useActiveSeason()` and `useFantasyTeams()`
- This results in multiple React Query hook instances, though React Query should deduplicate the actual API calls

### 2. Query Key Stability Issue
- `useFantasyTeams` uses `seasonId` in the query key: `fantasyTeamKeys.list(seasonId || '')`
- When `activeSeason` is `null` initially, the query key is `['fantasyTeams', 'list', { filters: '' }]`
- When `activeSeason` loads, the query key becomes `['fantasyTeams', 'list', { filters: '98bf9be3-...' }]`
- React Query treats these as **different queries**, causing refetches

### 3. Render Loop Pattern
- Logs showed 139+ renders during investigation
- Pattern: Component renders → `activeSeason` is `null` → `seasonId` is `null` → query key changes → React Query refetch → state update → re-render → repeat
- Even after data loads, something continues triggering re-renders

### 4. Active Season is Static
- User confirmed: "the current season should be for all intents and purposes static and known at build time"
- This suggests we shouldn't be fetching it repeatedly during hot reload

## Attempted Fixes (All Reverted)

### Failed Approach 1: Pass `activeSeason` as parameter
- **Attempt**: Modified `useFantasyTeamData` to accept `activeSeason` as optional parameter
- **Result**: Didn't fix the issue - still had multiple calls and query key changes

### Failed Approach 2: Cache lookup for stable season ID
- **Attempt**: Used `queryClient.getQueryData()` to get cached season and keep query key stable
- **Result**: Created render loops (139+ renders)

### Failed Approach 3: Memoization
- **Attempt**: Used `useMemo` to memoize `seasonIdForTeams` and return value
- **Result**: Still had render loops

### Failed Approach 4: Disable refetch flags
- **Attempt**: Added `refetchOnMount: false`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`
- **Result**: Didn't prevent the initial render loop

### Failed Approach 5: Disable history manipulation in dev
- **Attempt**: Disabled `window.history.pushState()` in `useUnsavedChangesGuard` during development
- **Result**: Didn't fix the core issue

## Root Cause Hypothesis

The core issue appears to be:

1. **Query Key Instability**: When `activeSeason` is `null`, `useFantasyTeams` is called with `seasonId: null`, creating query key `['fantasyTeams', 'list', { filters: '' }]`. When it loads, the key becomes `['fantasyTeams', 'list', { filters: '98bf9be3-...' }]`, which React Query treats as a different query.

2. **Multiple Hook Instances**: Calling `useFantasyTeamData` twice creates two separate React Query hook instances, even if they use the same query key (React Query deduplicates at the query level, not the hook level).

3. **Render Loop Trigger**: Something in the component lifecycle is causing state updates that trigger re-renders, which changes query parameters, which triggers refetches, which update state, creating a loop.

## Recommendations

1. **Ensure Query Key Stability**: The `useFantasyTeams` query key should not change once the season ID is loaded. Consider:
   - Using a module-level variable or React Context to store the season ID once loaded
   - Or ensuring `seasonId` never changes from a value back to `null` once loaded

2. **Consolidate Data Fetching**: Consider calling `useFantasyTeamData` only once instead of twice, or refactor to avoid the duplicate call pattern.

3. **Investigate Render Triggers**: Use React DevTools Profiler to identify what's causing the repeated renders - is it state updates from hooks, parent component re-renders, or something else?

4. **Consider Build-Time Season**: Since the active season is static, consider fetching it at build time or storing it in an environment variable/constant rather than fetching it at runtime.

5. **React Query Configuration**: Review React Query's default configuration in `QueryProvider` - the default `staleTime` of 30 seconds might be causing refetches during hot reload.

## Files Modified (All Reverted)

All instrumentation and code changes have been reverted. The following files were modified during investigation:

- `app/fantasy/page.tsx`
- `lib/hooks/useFantasyTeamData.ts`
- `lib/queries/fantasy-teams-test.queries.ts`
- `lib/api/test.api.ts`
- `lib/hooks/useUnsavedChangesGuard.ts`
- `lib/hooks/useFantasyTeamSelection.ts`
- `lib/hooks/useFantasyAuth.ts`

All changes have been reverted to original state.

