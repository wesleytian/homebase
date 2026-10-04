-- Enable RLS on tables that were missing it
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;

-- Add user_id column to finances (was missing)
ALTER TABLE finances ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
UPDATE finances SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
ALTER TABLE finances ALTER COLUMN user_id SET NOT NULL;

-- Add missing INSERT policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Users insert own') THEN
    CREATE POLICY "Users insert own" ON analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quick_notes' AND policyname = 'Users insert own') THEN
    CREATE POLICY "Users insert own" ON quick_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users insert own') THEN
    CREATE POLICY "Users insert own" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finances' AND policyname = 'Users see own') THEN
    CREATE POLICY "Users see own" ON finances FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finances' AND policyname = 'Users insert own') THEN
    CREATE POLICY "Users insert own" ON finances FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finances' AND policyname = 'Users update own') THEN
    CREATE POLICY "Users update own" ON finances FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finances' AND policyname = 'Users delete own') THEN
    CREATE POLICY "Users delete own" ON finances FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
