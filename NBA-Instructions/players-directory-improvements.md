# Players Directory — Improvements

> Take this file to Claude Code and execute against the Hoopstack frontend (`frontend/` directory).
> The app is Next.js 16 (App Router), TypeScript, Tailwind CSS 4, React Query 5.
> API runs at `http://localhost:8000`. The players page is `src/app/players/page.tsx`.

---

## Context

The Players Directory page is functional — grid/table views, search, position and team filters, sorting, pagination, and a compare flow all work. But the page undersells the data we have. Every player card shows the same 3 stats (PPG, RPG, APG) with no context, the table view doesn't take advantage of its format to show more, and several data/UX issues reduce trust and usability.

---

## Changes to Make

### 1. Fix missing stats and "0" rendering bug

**Problem:** Several player cards (Ace Bailey, Adou Thiero, Alex Toohey) show no stats or display a raw "0" with no label. This looks broken and erodes trust in the data.

**Fix:** In the player card component (`src/components/players/player-card.tsx`), handle null/zero stats gracefully:
- If all three stats are null/zero, show "No stats available" or "0 GP" instead of blank space or a bare "0"
- Check whether the issue is frontend (not rendering nulls) or backend (players missing from the aggregation query in `api/queries/players.py`)

### 2. Add Games Played (GP) to player cards

**Problem:** There's no way to know if a player's averages are based on 2 games or 70. Sample size context is essential for stat credibility.

**Fix:**
- Add GP to the `LIST_PLAYERS` SQL query in the backend (it's a simple `COUNT(*)` that may already be computed but not returned)
- Display GP on each player card — small and subtle, e.g., "62 GP" below the position line or next to the stat row
- In table view, add a GP column

### 3. Add FG% and MIN to player cards

**Problem:** PPG/RPG/APG tells a volume story but nothing about efficiency or role. These are available in `fct_player_game_advanced` but not surfaced.

**Fix:**
- Add `AVG(fg_pct)` and `AVG(min)` to the backend query
- In **card view**, add a second row of stats below PPG/RPG/APG showing FG% and MIN. Keep them smaller/lighter to maintain visual hierarchy. If this feels too crowded, show them on hover instead.
- In **table view**, add FG%, MIN, and optionally TS% and STL as additional columns — table format can support more data density

### 4. Add more sort options

**Problem:** Sort options are limited to Name, PPG, RPG, APG, Team, Position. Users can't sort by efficiency or defensive stats even though the data exists.

**Fix:** Add sort options for:
- FG%
- Minutes (MIN)
- Games Played (GP)

Update the `SORT_MAP` in the backend query (`api/queries/players.py`) and the sort dropdown in the frontend.

### 5. Add minimum games played filter

**Problem:** The directory shows all 530 players including those with 1-2 games. This clutters the list and surfaces misleading averages (e.g., a player with 1 game averaging 30 PPG).

**Fix:**
- Add a "Min GP" filter — either a small input field or a toggle like "Rotation players only (15+ GP)"
- Pass the threshold to the API as a query parameter
- Backend filters with `HAVING COUNT(*) >= :min_gp` in the aggregation query
- Default to showing all players (no minimum) to preserve current behavior, but make it easy to apply

### 6. Make the season selector work on the Players page

**Problem:** The global header has a season selector (2024-25) but the backend query hardcodes `season_id LIKE '%2024'`. Changing seasons does nothing on this page.

**Fix:**
- Pass the selected season from the global context into the `usePlayers` hook
- Send it to the API as a query parameter
- Update the backend SQL to use the parameter instead of the hardcoded value
- This lets users browse historical rosters and stats

### 7. Enrich table view with more columns

**Problem:** Table view shows the exact same 3 stats as card view (PPG, RPG, APG). The whole point of switching to table view is data density — it should show more.

**Fix:** In table view (`src/components/players/player-search-results.tsx`), add columns:
- GP
- MIN
- FG%
- TS% (if available)
- STL
- BLK
- TOV

Make columns sortable by clicking the header. Keep card view focused on the core stats to avoid clutter.

### 8. Remove duplicate search input

**Problem:** There's a search bar in the global header AND a "Search by name..." input in the page filter bar. They serve the same purpose and having both is confusing.

**Fix:** Remove the inline "Search by name..." input from the players page filter bar. The header search already handles player search and navigates to `/players?search={query}`. Make sure the page reads the `search` query parameter on load and pre-fills the filter state from it.

### 9. Improve compare discoverability

**Problem:** The compare feature exists but there's no visible affordance on the player cards in the default view. Users have to discover it accidentally.

**Fix:**
- Add a subtle compare icon/checkbox on each player card (e.g., a small "+" or "VS" badge in the corner)
- When 1 player is selected, highlight it and show a floating bar: "Select another player to compare"
- When 2 are selected, show a "Compare" button that navigates to `/compare?p1={id1}&p2={id2}`

### 10. Handle multi-position players in position filter

**Problem:** Position filter buttons (Guard, Forward, Center) likely miss players listed as "Guard-Forward" or "Center-Forward" when filtering for a single position.

**Fix:** Ensure the backend position filter uses `ILIKE '%guard%'` (or equivalent) rather than exact match, so "Guard-Forward" players appear when filtering by either Guard or Forward. Verify this works and fix if needed.

---

## Priority Order

1. **Fix missing stats / "0" bug** (#1) — data accuracy, quick fix
2. **Add GP to cards** (#2) — low effort, high context value
3. **Season selector support** (#6) — core functionality gap
4. **Enrich table view** (#7) — quick win for power users
5. **Add FG% and MIN** (#3) — moderate effort, rounds out the stat story
6. **Add min GP filter** (#5) — moderate effort, cleaner browsing
7. **Add more sort options** (#4) — low effort once new stats are added
8. **Remove duplicate search** (#8) — small cleanup
9. **Multi-position filter fix** (#10) — verify and fix if needed
10. **Improve compare discoverability** (#9) — moderate effort, UX polish

---

## Files Likely to Touch

- `src/app/players/page.tsx` — main page, filters, state, season param
- `src/components/players/player-card.tsx` — card stat display, GP, compare affordance
- `src/components/players/player-search-results.tsx` — table view columns
- `src/lib/hooks/use-players.ts` — query params (season, min GP)
- `src/lib/api.ts` — updated fetch params
- `api/routers/players.py` — new query params (season, min_gp, sort options)
- `api/queries/players.py` — SQL changes (GP, FG%, MIN, season param, min GP filter, sort map)

---

## Things to NOT Change

- Don't touch the sidebar design or navigation structure
- Don't change the color palette or CSS custom properties
- Don't modify other pages (homepage, player profiles, games, teams)
- Don't change the React Query configuration or API client structure
- Keep the dark theme as-is
- Keep the 24-per-page pagination as-is
