-- Runs once, on first boot of an empty postgres volume.
--
-- Creates the three schemas the pipeline writes into so that ingestion and dbt
-- have somewhere to land without any manual setup. Tables themselves are
-- created by the ingestion job (raw.*) and by dbt (staging.*, analytics.*),
-- so a fresh stack comes up with these schemas present but empty.

CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS analytics;
