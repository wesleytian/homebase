-- Fix: persist bullet state on todos (previously silently swallowed by the client)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS is_bullet BOOLEAN DEFAULT false;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS is_toggle BOOLEAN DEFAULT false;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS toggle_collapsed BOOLEAN DEFAULT false;

-- Health item metadata: emoji + priority (e.g., 'low' = later in life)
ALTER TABLE health_items ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '';
ALTER TABLE health_items ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT '';
