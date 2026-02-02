-- SQL Script #1: Add user_id columns and update RLS policies
-- Run this in Supabase SQL Editor BEFORE deploying the new code

-- Step 1: Add nullable user_id column to all tables
ALTER TABLE routines ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE completions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE todos ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE sections ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE life_goals ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE yearly_goals ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE quarterly_goals ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE reading_notes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE friends ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE friend_connections ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE cookie_jar ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE quick_notes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE monthly_reflections ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Step 2: Drop old permissive policies
DROP POLICY IF EXISTS "Allow all" ON routines;
DROP POLICY IF EXISTS "Allow all" ON completions;
DROP POLICY IF EXISTS "Allow all" ON todos;
DROP POLICY IF EXISTS "Allow all" ON sections;
DROP POLICY IF EXISTS "Allow all" ON life_goals;
DROP POLICY IF EXISTS "Allow all" ON yearly_goals;
DROP POLICY IF EXISTS "Allow all" ON quarterly_goals;
DROP POLICY IF EXISTS "Allow all" ON journal_entries;
DROP POLICY IF EXISTS "Allow all" ON reading_notes;
DROP POLICY IF EXISTS "Allow all" ON friends;
DROP POLICY IF EXISTS "Allow all" ON friend_connections;
DROP POLICY IF EXISTS "Allow all" ON cookie_jar;
DROP POLICY IF EXISTS "Allow all" ON quick_notes;
DROP POLICY IF EXISTS "Allow all" ON user_settings;
DROP POLICY IF EXISTS "Allow all" ON monthly_reflections;
DROP POLICY IF EXISTS "Allow all" ON analytics_events;

-- Step 3: Create temporary permissive policies that allow access to rows
-- where user_id matches OR user_id is null (for migration period)
CREATE POLICY "Users see own or unassigned" ON routines FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON routines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON routines FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON routines FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON completions FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON completions FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON completions FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON todos FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON todos FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON todos FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON sections FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON sections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON sections FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON sections FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON life_goals FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON life_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON life_goals FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON life_goals FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON yearly_goals FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON yearly_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON yearly_goals FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON yearly_goals FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON quarterly_goals FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON quarterly_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON quarterly_goals FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON quarterly_goals FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON journal_entries FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON journal_entries FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON journal_entries FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON reading_notes FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON reading_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON reading_notes FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON reading_notes FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON friends FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON friends FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON friends FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON friend_connections FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON friend_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON friend_connections FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON friend_connections FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON cookie_jar FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON cookie_jar FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON cookie_jar FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON cookie_jar FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON quick_notes FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON quick_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON quick_notes FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON quick_notes FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON user_settings FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON user_settings FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON user_settings FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON monthly_reflections FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON monthly_reflections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON monthly_reflections FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON monthly_reflections FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users see own or unassigned" ON analytics_events FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert own" ON analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own or unassigned" ON analytics_events FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users delete own or unassigned" ON analytics_events FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Step 4: Update unique constraints for per-user uniqueness
ALTER TABLE journal_entries DROP CONSTRAINT journal_entries_date_key;                                                    
  CREATE UNIQUE INDEX journal_entries_user_date ON journal_entries(user_id, date);
