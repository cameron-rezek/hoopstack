# Homepage Improvements — Implementation Spec

> Take this file to Claude Code and execute against the Hoopstack frontend (`frontend/` directory).
> The app is Next.js 15 (App Router), TypeScript, Tailwind CSS 4, React Query 5, D3.js 7, Recharts 2.
> API runs at `http://localhost:8000`. The homepage is `src/app/page.tsx`.

---

## Context

The current homepage has good bones (dark theme, sidebar, stat cards, shot quality leaderboard) but needs work to feel like a legit analytics product rather than a menu screen. The main problems:

1. **"Game Logs: 0" bug** — the stat card shows 0 but the DB has ~74k player game log rows. Either the `/health` endpoint key is mismatched or the frontend is reading the wrong field.
2. **Hero section is too tall and doesn't earn its space** — big title, one sentence, and a search bar taking up half the viewport.
3. **Four navigation cards are redundant with the sidebar** — every link already exists in the left nav. This is wasted space that could surface actual data.
4. **Shot quality leaderboard ignores the season selector** — hardcoded to 2023-24 instead of reacting to the global season context.
5. **No visual identity** — nothing on the page says "basketball" besides the text. The shot chart is the hero feature of the entire app and it's not teased at all.

---

## Changes to Make

### 1. Fix the Game Logs stat card bug

Check the `/health` endpoint response in the browser (`http://localhost:8000/health`). The `row_counts` object returns table names as keys. The frontend is probably looking for a key that doesn't match what the API returns (e.g., looking for `"game_logs"` when the API returns `"player_game_logs"` or `"fct_player_game_advanced"`).

Fix the key mapping in `src/app/page.tsx` so the Game Logs card shows the actual count (~74k). If the health endpoint doesn't return game log counts at all, the fix is in the API (`api/routers/` or `api/queries/`), but check the frontend mapping first since that's more likely.

### 2. Shrink the hero section and move search to the header

**Hero changes:**
- Cut the hero height roughly in half. Remove the large "Hoopstack" title text from the hero (it's already in the sidebar logo).
- Replace it with a compact welcome line, something like a one-liner tagline. Keep it tight.
- Move the search bar from the hero into the **header component** (`src/components/layout/header.tsx`) so it's accessible from every page, not just the homepage. The header currently has the "Dashboard" text on the left and season selector on the right — put the search bar in the center. On the homepage, the hero can show a brief tagline where the search bar used to be. On other pages, the search bar in the header becomes the primary way to find players.

**Search bar in the header:**
- Debounced input (300ms), same behavior as the current one
- On submit/selection, navigates to `/players?search={query}`
- Compact styling that fits the header without crowding the season selector
- Only shows the search bar on desktop widths (hide on mobile to avoid crowding)

### 3. Replace the four nav cards with data-forward content

Remove the Players / Teams / Compare / Leaderboards card row entirely. Replace it with a **two-column layout** that surfaces actual data:

**Left column (wider, ~60%): "Recent Games" feed**
- Fetch the 5 most recent games from the API. You can get these from `/teams/{teamId}/games` for a popular team, OR better: add a lightweight query. But simplest approach: use the existing data. Fetch team game logs sorted by date descending, take the top 5 unique game_ids, and display them as score cards.
- Each game card shows: date, away team abbreviation + score vs home team abbreviation + score, with the winner bolded.
- Each card links to `/games/{gameId}`.
- If fetching recent games is too complex without a dedicated endpoint, use a fallback: show a "Featured Player" mini-profile instead. Pick the top shot quality player for the selected season and show their headshot, key stats (PPG, TS%, PAX/100), and a link to their profile.

**Right column (~40%): Mini shot chart preview**
- This is the visual hook. Render a small, non-interactive version of the D3 half-court component (`src/components/shots/court.tsx`) showing a scatter of shots for the top-ranked shot quality player.
- Fetch their shots from `/players/{playerId}/shots?season={selectedSeason}&per_page=100` (just the first page is fine for a preview).
- Render made shots as green dots, missed as red, on the mini court.
- Below the court, show the player's name and a "View full shot chart →" link to their profile.
- This gives the homepage an immediate visual identity. Someone landing on this page will instantly understand this is a basketball analytics app.
- If the court component is too heavy for the homepage, a simpler alternative: render a static SVG court outline (no D3, just the SVG paths from the court component) with the shot dots overlaid. Keep it lightweight.

### 4. Make the Shot Quality leaderboard respect the season selector

The leaderboard section currently shows "Top Shot Quality 2023-24" regardless of the selected season. Fix it:

- Read the season from the global season context (`useSeasonContext` or whatever the hook is called in `src/contexts/season-context.tsx`).
- Pass `season={selectedSeason}` to the shot quality fetch call.
- Update the header text to reflect the selected season dynamically.
- When the season changes, the leaderboard should re-fetch and update.

### 5. Enhance the leaderboard rows

Each player row in the Top Shot Quality list should:

- **Link to the player's profile** (`/players/{playerId}`). The whole row should be clickable.
- **Show the team logo** next to the team name using `teamLogoUrl(teamId)` from `src/lib/constants.ts`. Fall back to just the team name text if the logo 404s.
- **Add a small FG% bar** — a thin horizontal bar behind the FG% number, filled proportionally (e.g., 78% FG = 78% width), using a subtle color. This makes the data more scannable at a glance vs. just numbers.

### 6. Add tabular-nums to stat displays

Make sure all numeric stat displays across the homepage use `font-variant-numeric: tabular-nums` (Tailwind class: `tabular-nums`). This ensures numbers align cleanly in columns. Apply to:
- The stat cards (530, 596,814, etc.)
- The leaderboard numbers (shots, FG%, PAX/100)
- Any other numeric displays

### 7. Stat cards improvements

The three stat cards (Players Tracked, Shot Charts, Game Logs) should:
- Use `tabular-nums` on the numbers
- Add a subtle hover state (`hover:border-[var(--accent)]/30 transition-colors`)
- Make them clickable links: Players Tracked → `/players`, Shot Charts → `/leaderboards`, Game Logs → `/players` (or wherever makes sense)
- Consider adding a fourth card: "Play-by-Play Events" with the PBP row count from the health endpoint, linking to a relevant page

---

## Layout Summary (top to bottom)

After these changes, the homepage flows like this:

```
┌─────────────────────────────────────────────┐
│ HEADER: [Dashboard]  [🔍 Search...]  [2024-25 ▾] │
├─────────────────────────────────────────────┤
│ Compact hero: tagline only (2-3 lines max)  │
├─────────────────────────────────────────────┤
│ Stat cards row: Players | Shots | Games | PBP │
├──────────────────────┬──────────────────────┤
│ Recent Games feed    │ Mini shot chart      │
│ (5 game scores)      │ (top player preview) │
│                      │ "View full chart →"  │
├──────────────────────┴──────────────────────┤
│ Top Shot Quality leaderboard (season-aware)  │
│ [rows with logos, FG% bars, clickable]       │
└─────────────────────────────────────────────┘
```

---

## Files to touch

- `src/app/page.tsx` — main homepage (biggest changes)
- `src/components/layout/header.tsx` — add search bar
- `src/components/ui/search-input.tsx` — may need to make it more compact/reusable for the header
- `src/lib/constants.ts` — verify `teamLogoUrl` is available
- `src/lib/api.ts` — may need to check if there's a good way to fetch recent games
- `src/components/shots/court.tsx` — reuse for mini preview (or create a simplified `mini-court.tsx`)

---

## Things to NOT change

- Don't touch the sidebar design or navigation structure
- Don't change the color palette or CSS custom properties
- Don't modify any other pages (player profiles, games, leaderboards, etc.)
- Don't change the React Query configuration or API client structure
- Keep the dark theme as-is. This is refinement, not a redesign.

---

## Priority order if you need to break this into commits

1. Fix the Game Logs: 0 bug (quick win, looks bad)
2. Make the leaderboard respect the season selector (functional fix)
3. Move search bar to header (structural change, improves every page)
4. Replace nav cards with Recent Games + Mini Shot Chart (the big visual upgrade)
5. Shrink the hero section (depends on search bar moving to header)
6. Leaderboard row enhancements (logos, links, FG% bars)
7. Stat card improvements (tabular-nums, hover, links)
