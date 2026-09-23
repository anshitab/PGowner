-- Run in Supabase SQL Editor if your project was created before food menu support.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS food_included boolean NOT NULL DEFAULT false;

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS weekly_menu jsonb NOT NULL DEFAULT '{}'::jsonb;
