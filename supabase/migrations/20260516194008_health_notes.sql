-- Personal notes / rationale per health item (pre-filled from suggestions, editable)
ALTER TABLE health_items ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
