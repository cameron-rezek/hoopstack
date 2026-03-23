# Dashboard Improvements — V2

> Follow-up improvements to the homepage after the initial round (see `homepage-improvements.md`).
> The app is Next.js 16 (App Router), TypeScript, Tailwind CSS 4, React Query 5, D3.js 7, Recharts 3.
> API runs at `http://localhost:8000`. The homepage is `src/app/page.tsx`.

---

## Context

The V1 homepage improvements landed well — search is in the header, stat cards show real counts, the featured player + shot chart preview gives visual identity, and the shot quality leaderboard respects the season selector. But there's still redundancy and missed opportunities to surface analytics-driven content.

---

## Changes to Make

### 1. Consolidate redundant featured player / leaderboard sections

**Problem:** The featured player section (Jokic with mini leaderboard rows #2-5 below) and the "Top Shot Quality" leaderboard section below it show the same 5 players with the same data. This is wasted vertical space.

**Fix:** Remove the mini leaderboard rows (#2-5) from the featured player section. Keep the featured player card (headshot, name, team, stats) as a standalone highlight. The "Top Shot Quality" section below already serves as the full leaderboard. This eliminates the duplication and tightens the page.

### 2. Improve the shot chart preview

**Problem:** The scatter plot at small size is hard to read — individual dots are too small to convey patterns.

**Fix:** Switch the shot chart preview to the **hexbin** or **zone** view instead of scatter. These aggregate shots into regions and communicate efficiency patterns at a glance, even at small sizes. If hexbin is too heavy to render for a preview, zones are simpler and still effective.

### 3. Remove or relocate System Status section

**Problem:** The "System Status" section at the bottom shows raw database table names (`FCT_PLAYER_GAME_ADVANCED`, `AGG_SHOT_QUALITY`, `STG_SHOT_CHARTS`, etc.) and row counts. This is developer/admin info that doesn't belong on a user-facing dashboard.

**Fix options (pick one):**
- **Option A (recommended):** Remove it entirely from the homepage. The stat cards at the top already give a user-friendly version of data scale.
- **Option B:** Move it to a collapsible "System" section that's collapsed by default.
- **Option C:** Move it to a dedicated `/admin` or `/status` page.

### 4. Replace raw stat cards with user-relevant metrics

**Problem:** "615,936 Shot Charts" and "1,616,871 Play-by-Play" are impressive numbers but not actionable for a user trying to explore NBA data.

**Fix:** Replace some or all of the 4 stat cards with metrics users care about:
- **Games This Season** — count of unique games in the selected season
- **Last Updated** — when data was last refreshed
- **Seasons Available** — e.g., "3 seasons (2022-25)"
- **Players Tracked** — this one is fine to keep

Alternatively, keep the current cards but make them more useful by linking them to relevant pages (Players Tracked -> /players, Shot Charts -> /leaderboards?tab=shot-quality, Game Logs -> /leaderboards, Play-by-Play -> latest game).

### 5. Add additional leaderboard categories

**Problem:** The homepage only surfaces one leaderboard dimension (Shot Quality / PAX/100). Users interested in other stats have no quick entry point.

**Fix:** Add 2-3 additional compact "Top 5" lists below or alongside the shot quality leaderboard. Candidates:
- **Scoring Leaders** — Top 5 by PPG (from player summary data)
- **Efficiency Leaders** — Top 5 by TS% (min games filter)
- **Assist Leaders** — Top 5 by APG

These can be displayed in a horizontal row of cards or a tabbed interface within a single section (e.g., tabs: Shot Quality | Scoring | Efficiency | Assists). Each row links to the player profile.

### 6. Add a "Recent Games" section

**Problem:** Game detail pages are only reachable through player or team drill-down. There's no direct entry point from the homepage.

**Fix:** Add a "Recent Games" section showing the 5-10 most recent games. Each row shows:
- Date
- Away team abbreviation + score vs Home team abbreviation + score (winner bolded)
- Link to `/games/{gameId}`

This may require a new API endpoint (e.g., `GET /games?sort=date&order=desc&per_page=5`) or can be derived from existing team game log data.

### 7. Add a "Trending Players" section

**Problem:** The rolling stats data is a unique feature but isn't surfaced on the homepage at all.

**Fix:** Use rolling stats to identify players on hot/cold streaks and display a "Trending" widget. For example:
- Compare each player's 5-game rolling PPG to their season average
- Show the top 3-5 players with the biggest positive delta
- Display: player name, team, season avg PPG, recent 5-game avg PPG, delta with an up arrow

This is a differentiating feature — most basketball stats sites don't surface trending data on their homepage.

### 8. Fix leaderboard ranking display

**Problem:** In the featured player leaderboard, Jarrett Allen (#4) shows 22.7 PAX/100, which is higher than KD (#2) at 20.2 and SGA (#3) at 10.1. The sort appears to be by shot quality score, but the displayed metric is PAX/100 — this mismatch is confusing.

**Fix:** Either:
- Sort the leaderboard by the displayed metric (PAX/100), OR
- Show the metric being sorted by (shot quality score) alongside PAX/100, OR
- Add a label clarifying the sort: "Ranked by Shot Quality Score"

### 9. Add context to the featured player's "Quality" stat

**Problem:** The featured player card shows "QUALITY: 1.0" with no context. Users don't know if 1.0 is good, average, or what the scale is.

**Fix:** Add context — either:
- Show league average next to it (e.g., "1.0 (avg: 0.5)")
- Show a percentile (e.g., "1.0 — 98th percentile")
- Add a small tooltip explaining what the quality score means

---

## Priority Order

1. **Consolidate redundant sections** (#1) — quick win, reduces clutter
2. **Remove/relocate System Status** (#3) — quick win, cleaner page
3. **Fix leaderboard ranking** (#8) — data accuracy issue
4. **Add Quality stat context** (#9) — small but impactful
5. **Improve shot chart preview** (#2) — visual upgrade
6. **Replace stat cards** (#4) — moderate effort
7. **Add Recent Games** (#6) — may need API work
8. **Add leaderboard categories** (#5) — moderate UI work
9. **Add Trending Players** (#7) — most complex, highest differentiation

---

## Files Likely to Touch

- `src/app/page.tsx` — main homepage (most changes)
- `src/components/shots/` — shot chart preview changes
- `src/lib/api.ts` — new endpoints for recent games, trending
- `src/hooks/` — new query hooks if needed
- `src/components/ui/` — any new shared components (trending card, game score card)

---

## Things to NOT Change

- Don't touch the sidebar design or navigation structure
- Don't change the color palette or CSS custom properties
- Don't modify other pages (player profiles, games, teams, etc.)
- Don't change the React Query configuration or API client structure
- Keep the dark theme as-is
