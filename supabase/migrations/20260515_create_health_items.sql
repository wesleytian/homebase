-- Health page: simple polymorphic table for facts, supplements, medkit, tests, records
CREATE TABLE IF NOT EXISTS health_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  section TEXT NOT NULL CHECK (section IN ('fact', 'supplement', 'medkit', 'test', 'record')),
  name TEXT NOT NULL,
  value TEXT DEFAULT '',
  link TEXT DEFAULT '',
  date TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS health_items_user_section_idx ON health_items(user_id, section, sort_order);

ALTER TABLE health_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_items' AND policyname = 'Users see own') THEN
    CREATE POLICY "Users see own" ON health_items FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_items' AND policyname = 'Users insert own') THEN
    CREATE POLICY "Users insert own" ON health_items FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_items' AND policyname = 'Users update own') THEN
    CREATE POLICY "Users update own" ON health_items FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_items' AND policyname = 'Users delete own') THEN
    CREATE POLICY "Users delete own" ON health_items FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
