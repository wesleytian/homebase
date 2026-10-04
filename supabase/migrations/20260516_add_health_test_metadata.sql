-- Add location and frequency metadata to health_items for tests/scans
ALTER TABLE health_items ADD COLUMN IF NOT EXISTS where_at TEXT DEFAULT '';
ALTER TABLE health_items ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT '';
