-- Run this once in the Supabase SQL editor.
-- Stores the AI's read of an uploaded prescription photo, so admin can
-- see what it found without re-reading the image themselves.

alter table bookings
  add column if not exists prescription_ai_confidence numeric,
  add column if not exists prescription_ai_summary text;
