# Hoopstack

A data-driven NBA analytics platform built on 15+ seasons of play-by-play, shot chart, and box score data. Goes beyond basic stat tables to surface real insight through sophisticated modeling, compelling visualization, and clean data engineering.

## What This Is

Hoopstack is a full-stack analytics platform that ingests raw NBA data, transforms it through a layered data model (raw → staging → analytics), and serves it through an API to power interactive visualizations. The goal is to answer questions that box scores can't — things like shot quality vs. shot making, lineup synergy, game momentum, and performance trends over time.

## Architecture

```
NBA Stats API → Python Ingestion → PostgreSQL (Raw)
                                        ↓
                                   dbt (Staging + Analytics)
                                        ↓
                                   FastAPI (REST API)
                                        ↓
                                   Next.js + D3.js (Frontend)
```

**Infrastructure:** PostgreSQL 16, Redis, Apache Airflow, and FastAPI all run as Docker containers on an Unraid server. The frontend deploys to Vercel.

## Features (Planned)

- **Shot Chart Explorer** — Interactive court visualizations with hexbin density maps, zone heatmaps, and expected value overlays
- **Player Comparison Dashboard** — Radar charts, rolling trends, and percentile rankings across advanced metrics
- **Game Flow Visualization** — Score differential timelines, win probability curves, and lineup stint overlays
- **Lineup Laboratory** — Five-man unit performance, two-man/three-man pairing analysis, and the four factors
- **Shot Quality Model** — Logistic regression that separates shot selection from shot-making ability

## Data

- **Source:** NBA Stats API via `nba_api` Python library, supplemented by Basketball Reference
- **Scope:** 2010-11 season through present (~15 seasons)
- **Volume:** ~3.75M+ shot attempts, ~8.5M+ play-by-play events, ~2M+ player game logs
- **Update cadence:** Nightly batch during the NBA season

## Tech Stack

| Layer | Tech |
|-------|------|
| Database | PostgreSQL 16 |
| Transformations | dbt Core |
| Orchestration | Apache Airflow |
| API | FastAPI |
| Cache | Redis |
| Frontend | Next.js, React, D3.js, Recharts |
| Modeling | scikit-learn, statsmodels |
| Infrastructure | Docker on Unraid |
| Frontend Hosting | Vercel |

## Project Structure

```
hoopstack/
├── ingestion/       # Python ETL scripts for NBA API data pulls
├── dbt/             # dbt project (staging + analytics transformations)
│   ├── models/
│   │   ├── staging/
│   │   └── analytics/
│   └── tests/
├── api/             # FastAPI application
├── frontend/        # Next.js + D3.js frontend
├── scripts/         # Utility scripts, backfills, one-offs
└── docs/            # Architecture diagrams, notes
```

## Setup

_Detailed setup instructions coming soon._

## Status

🔧 **Phase 1: Data Foundation** — Building out the database schema, ETL pipeline, and dbt transformations.
