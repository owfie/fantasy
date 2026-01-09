-- Add slug column to teams table
ALTER TABLE teams ADD COLUMN slug TEXT;

-- Create unique index on slug (allowing nulls)
CREATE UNIQUE INDEX teams_slug_unique ON teams (slug) WHERE slug IS NOT NULL;

-- Update existing teams with slugs
UPDATE teams SET slug = 'titans' WHERE name ILIKE '%titans%';
UPDATE teams SET slug = 'riptide' WHERE name ILIKE '%riptide%';
UPDATE teams SET slug = 'flyers' WHERE name ILIKE '%flyers%';
UPDATE teams SET slug = 'force' WHERE name ILIKE '%force%';

