# Rolling Stats Page — Improvements TODO

## Bugs

- [ ] **USG stat card shows 1690.0% (season avg 2060.0%)** — Usage rate is getting multiplied by 100 twice. The chart tooltip shows correct values (~16-22%), so the bug is isolated to the stat card component. Likely `formatPct` is being applied to a value that's already in percentage form. Check whether `usage_rate` comes back from the API as 0.16 or 16.0 and handle accordingly.

- [ ] **Stat dropdown overlaps tab navigation** — When the stat selector dropdown opens, it renders on top of the "Game Log" / "Shot Chart" / "Rolling Stats" tabs. Needs a z-index fix or the dropdown should open downward below the control bar instead of over the tabs.

---

## UI Polish

- [ ] **Add labels to chart tooltip** — The tooltip currently shows four colored values with no text labels. Hard to tell which is the 5-game, 10-game, 20-game, or season average without guessing. Add short labels like "5G: 20.0%", "10G: 20.5%", "20G: 16.1%", "Season: 15.2%".

- [ ] **Auto-scale chart y-axis** — Usage rate hovers around 15-22% but the y-axis goes all the way to 60%. Lots of dead space. Auto-scale the y-axis to the data range with reasonable padding instead of using fixed ranges. Apply the same logic to all stat selections so charts always feel tight and readable.

- [ ] **Percentile context on stat cards** — Each stat card (PTS, AST, REB, TS%, USG, +/-) currently shows the rolling value, a trend arrow, and season average. Add a percentile rank: "12.6 PTS (63rd percentile among forwards)". This is what separates generic stats from actually useful context. Could compute league-wide percentiles in a new dbt model or calculate at query time with `PERCENT_RANK()`.

- [ ] **Shot Quality section feels disconnected** — Sitting at the bottom with no visual relationship to the rest of the page. Options:
  - Add a section header with a brief explainer ("How efficient is this player's shot selection and shot-making?")
  - Make it collapsible
  - Move it to its own sub-tab
  - Add tooltips on "PAX/100", "Shot Quality Score", "Shot Making Score" explaining what they mean — most users won't know

- [ ] **Game log mini-strip below the chart** — When hovering a data point on the rolling chart, show the actual box score line from that game in a small row beneath the chart (date, matchup, W/L, PTS, REB, AST, the stat being viewed). Seeing the context behind a spike or dip is what makes rolling stats actually useful. Would be a nice differentiator.

- [ ] **Trend arrow logic review** — Verify the trend arrows on stat cards are comparing the right things (last 5-game avg vs. season avg, or last game vs. rolling avg). Make sure the direction and color make sense for stats where lower is better (like TOV%).

---

## Missing Stats (Add to Stat Selector Dropdown)

### Quick wins — already computed, just not wired up

- [ ] **Turnover Rate (TOV%)** — Already in `fct_player_game_advanced`, already in `agg_player_rolling_stats` rolling averages. Just needs to be added to the stat dropdown and rolling chart.

- [ ] **Assist Rate (AST%)** — Same situation. Computed in the analytics layer, not surfaced in the UI.

- [ ] **Offensive Rebound Rate (ORB%)** — Same.

- [ ] **Defensive Rebound Rate (DRB%)** — Same.

- [ ] **Effective FG% (eFG%)** — Already computed. Useful alternative to TS% since it isolates field goal efficiency without free throws.

### Medium effort — new computations from existing data

- [ ] **Per-possession stats** — Points, assists, rebounds per 100 possessions instead of per game. Normalizes for pace and minutes. You already have `pace` in `fct_player_game_advanced`. Derive per-100-possession versions of counting stats in a new dbt model or computed column. This is the core value prop of Cleaning the Glass.

- [ ] **Frequency + efficiency by zone with percentiles** — You have zone data in `stg_shot_charts`. Build a view that shows "38% from above-the-break threes (72nd percentile)" by computing league-wide zone FG% distributions and ranking the player against them.

- [ ] **Shooting splits by action type** — Catch-and-shoot vs. pull-up, driving layup vs. post-up, etc. You have `action_type` in shot chart data. Group shots by action type and show FG% and frequency for each. Won't be as granular as tracking data (no defender distance) but still useful.

- [ ] **Opponent-adjusted metrics** — Performance against top-10 defenses vs. bottom-10. Join player game logs against opponent team defensive ratings for the season. New analytics model.

### Larger effort — new data models or data sources needed

- [ ] **On/off splits** — How does the team perform with this player on the court vs. off? One of the most referenced stats on Cleaning the Glass. Would need to build stint-level data from PBP (identify substitution events, compute team stats during each stint). Significant new dbt model work but very high value.

- [ ] **Half-court vs. transition splits** — Cleaning the Glass signature stat. Could approximate from PBP by looking at time elapsed between possession changes and the next scoring action. Noisy without tracking data but still directionally useful.

- [ ] **Contested vs. open shots** — Requires NBA tracking data (defender distance at time of shot). Not available through the public `nba_api`. Would need to find an alternative data source or scrape from stats.nba.com's tracking endpoints if they're still accessible.

---

## New Features for the Page

- [ ] **Percentile ranking model** — New dbt model: for each stat, compute `PERCENT_RANK()` across all players (and optionally by position) for the season. Store as a table so the API can serve percentiles alongside raw stats. Powers the percentile context on stat cards and could power a radar/percentile chart.

- [ ] **Stat comparison overlay** — Option to overlay a second player's rolling line on the same chart for quick visual comparison. You already have the Compare page, but having a lightweight "compare to..." option right on the player profile would be slick.

- [ ] **Season-over-season toggle** — Show rolling stats from multiple seasons overlaid on the same chart (aligned by game number). Useful for "is this player declining?" analysis.

- [ ] **Game result context on chart** — Subtle markers on the x-axis or background shading for wins vs. losses. Helps correlate individual performance with team outcomes.

---

## Priority Order (suggested)

**Ship first (bug fixes + quick wins):**
1. Fix USG formatting bug
2. Fix dropdown z-index overlap
3. Add labels to chart tooltip
4. Auto-scale chart y-axis
5. Add TOV%, AST%, ORB%, DRB%, eFG% to stat dropdown

**Ship second (meaningful depth):**
6. Percentile ranking model + stat card context
7. Shot Quality section explainer tooltips
8. Game log mini-strip on hover
9. Shooting splits by action type

**Ship third (differentiators):**
10. Per-possession stats
11. Opponent-adjusted metrics
12. On/off splits
13. Season-over-season overlay
