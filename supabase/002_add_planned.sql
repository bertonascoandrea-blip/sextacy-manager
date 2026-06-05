-- Migration 002: Add 'planned' match status and 'notes' field
-- Run this in the Supabase SQL editor before using the Programma feature.

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('planned', 'pending', 'live', 'done'));

ALTER TABLE matches ADD COLUMN IF NOT EXISTS notes text;
