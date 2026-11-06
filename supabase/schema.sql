-- Homebase: full schema for a fresh Supabase project.
--
-- Paste this whole file into the Supabase SQL editor and run it. It creates
-- every table, column, index, RLS policy and function the app uses. It is
-- idempotent: running it again is a no-op.
--
-- The older files (supabase-schema.sql, sql-migration-1-add-user-id.sql,
-- supabase/migrations/*) are kept only as history of how the original
-- database evolved. A new setup only needs this file.
--
-- Conventions (matching what src/db.ts reads and writes):
--   * created_at / updated_at / other timestamps are bigint epoch milliseconds
--     (the client sends Date.now()), except error_logs.created_at.
--   * Every row belongs to a user. user_id defaults to auth.uid() and RLS lets
--     a signed-in user see and change only their own rows.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  frequency_per_week int not null default 1,
  metadata text default '',
  "order" int not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_streak_week bigint,           -- week-start timestamp of last streak week
  last_streak_date bigint,           -- legacy; still sent (as null) on insert
  streak_grace_used boolean not null default false
);

create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  routine_id uuid references public.routines(id) on delete cascade,
  completed_at bigint not null,
  week_start bigint not null
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  collapsed boolean not null default false,
  "order" int not null default 0,
  parent_id uuid references public.sections(id) on delete set null,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  section_id uuid references public.sections(id) on delete set null,
  "order" int not null default 0,
  indent int not null default 0,
  completed_at bigint,
  is_bullet boolean default false,
  is_toggle boolean default false,
  toggle_collapsed boolean default false,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.life_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  "order" int not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.yearly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  "order" int not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.quarterly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  subtasks jsonb not null default '[]'::jsonb,  -- [{ id, text, completed }]
  "order" int not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null,                -- YYYY-MM-DD
  grateful_for text default '',
  make_it_great text default '',
  affirmations text default '',
  amazing_things text default '',
  learned text default '',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique (user_id, date)
);

create table if not exists public.monthly_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month text not null,               -- YYYY-MM
  overall text default '',
  overall_life text default '',
  challenges text default '',
  looking_forward text default '',
  rating_overall numeric(4, 1) default 0,
  rating_health numeric(4, 1) default 0,
  rating_career numeric(4, 1) default 0,
  rating_finances numeric(4, 1) default 0,
  rating_friends numeric(4, 1) default 0,
  rating_family numeric(4, 1) default 0,
  rating_romance numeric(4, 1) default 0,
  rating_fun numeric(4, 1) default 0,
  rating_growth numeric(4, 1) default 0,
  rating_mental_health numeric(4, 1) default 0,
  rating_spirituality numeric(4, 1) default 0,
  rating_environment numeric(4, 1) default 0,
  rating_productivity numeric(4, 1) default 0,
  notes_overall text default '',
  notes_health text default '',
  notes_career text default '',
  notes_finances text default '',
  notes_friends text default '',
  notes_family text default '',
  notes_romance text default '',
  notes_fun text default '',
  notes_growth text default '',
  notes_mental_health text default '',
  notes_spirituality text default '',
  notes_environment text default '',
  notes_productivity text default '',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique (user_id, month)
);

create table if not exists public.reading_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source text not null,
  content text not null,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  notes text default '',
  tier int not null default 3,
  last_contact bigint,
  "order" int not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.friend_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  friend_id_1 uuid references public.friends(id) on delete cascade,
  friend_id_2 uuid references public.friends(id) on delete cascade,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- One-document-per-user tables. The client reads them with maybeSingle(),
-- so each user has at most one row.
create table if not exists public.cookie_jar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  content text default '',
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.finances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  content text default '',
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.quick_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  content text default '',
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.health_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  section text not null check (section in ('fact', 'supplement', 'medkit', 'test', 'record')),
  name text not null,
  value text default '',
  link text default '',
  date text default '',
  where_at text default '',
  frequency text default '',
  emoji text default '',
  priority text default '',
  notes text default '',
  sort_order int not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Analytics events are sent with user_id only when someone is signed in,
-- so user_id is nullable here. RLS still only accepts the caller's own id.
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  event text not null,
  properties jsonb not null default '{}'::jsonb,
  session_id text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null,
  message text not null,
  detail text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes (every query filters by user_id)
-- ---------------------------------------------------------------------------

create index if not exists routines_user_order_idx on public.routines (user_id, "order");
create index if not exists completions_user_week_idx on public.completions (user_id, week_start);
create index if not exists completions_routine_idx on public.completions (routine_id);
create index if not exists sections_user_order_idx on public.sections (user_id, "order");
create index if not exists sections_parent_idx on public.sections (parent_id);
create index if not exists todos_user_order_idx on public.todos (user_id, "order");
create index if not exists todos_section_idx on public.todos (section_id);
create index if not exists life_goals_user_idx on public.life_goals (user_id, "order");
create index if not exists yearly_goals_user_idx on public.yearly_goals (user_id, "order");
create index if not exists quarterly_goals_user_idx on public.quarterly_goals (user_id, "order");
create index if not exists reading_notes_user_idx on public.reading_notes (user_id, created_at);
create index if not exists friends_user_order_idx on public.friends (user_id, "order");
create index if not exists friend_connections_user_idx on public.friend_connections (user_id);
create index if not exists friend_connections_f1_idx on public.friend_connections (friend_id_1);
create index if not exists friend_connections_f2_idx on public.friend_connections (friend_id_2);
create index if not exists health_items_user_section_idx on public.health_items (user_id, section, sort_order);
create index if not exists analytics_events_user_idx on public.analytics_events (user_id);
create index if not exists idx_error_logs_user_id on public.error_logs (user_id);
create index if not exists idx_error_logs_created_at on public.error_logs (created_at);

-- ---------------------------------------------------------------------------
-- Row-level security: each user can only touch their own rows
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'routines', 'completions', 'sections', 'todos',
    'life_goals', 'yearly_goals', 'quarterly_goals',
    'journal_entries', 'monthly_reflections', 'reading_notes',
    'friends', 'friend_connections',
    'cookie_jar', 'finances', 'quick_notes', 'user_settings',
    'health_items', 'analytics_events', 'error_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format('drop policy if exists "Users select own" on public.%I', t);
    execute format('drop policy if exists "Users insert own" on public.%I', t);
    execute format('drop policy if exists "Users update own" on public.%I', t);
    execute format('drop policy if exists "Users delete own" on public.%I', t);

    execute format('create policy "Users select own" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "Users insert own" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "Users update own" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "Users delete own" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RPC: atomic todo reordering (called from reorderTodos in src/db.ts)
-- ---------------------------------------------------------------------------
-- items: jsonb array of { id: uuid, order: int, section_id: uuid|null }.
-- SECURITY INVOKER (the default), so RLS still applies.

create or replace function public.reorder_todos(items jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.todos t
  set "order"    = (elem->>'order')::int,
      section_id = nullif(elem->>'section_id', '')::uuid
  from jsonb_array_elements(items) as elem
  where t.id = (elem->>'id')::uuid
    and t.user_id = auth.uid();
end;
$$;

revoke execute on function public.reorder_todos(jsonb) from public, anon;
grant execute on function public.reorder_todos(jsonb) to authenticated;
