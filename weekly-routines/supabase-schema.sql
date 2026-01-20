-- Routines table
create table routines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  frequency_per_week int not null default 1,
  metadata text default '',
  "order" int not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Completions table
create table completions (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid references routines(id) on delete cascade,
  completed_at bigint not null,
  week_start bigint not null
);

-- Todos table
create table todos (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  completed boolean not null default false,
  section_id uuid,
  "order" int not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Sections table
create table sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  collapsed boolean not null default false,
  "order" int not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Add foreign key for todos -> sections
alter table todos add constraint todos_section_fk foreign key (section_id) references sections(id) on delete set null;

-- Life Goals table
create table life_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  "order" int not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Yearly Goals table
create table yearly_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  "order" int not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Quarterly Goals table
create table quarterly_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  "order" int not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Journal Entries table
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  date text not null unique,
  grateful_for text default '',
  make_it_great text default '',
  affirmations text default '',
  amazing_things text default '',
  learned text default '',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Reading Notes table
create table reading_notes (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  content text not null,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Friends table
create table friends (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text default '',
  tier int not null default 3,
  last_contact bigint,
  "order" int not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Friend Connections table
create table friend_connections (
  id uuid primary key default gen_random_uuid(),
  friend_id_1 uuid references friends(id) on delete cascade,
  friend_id_2 uuid references friends(id) on delete cascade,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Cookie Jar table
create table cookie_jar (
  id uuid primary key default gen_random_uuid(),
  content text default '',
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Insert default cookie jar row
insert into cookie_jar (id, content) values ('00000000-0000-0000-0000-000000000001', '');

-- Enable Row Level Security (but allow all for now since no auth)
alter table routines enable row level security;
alter table completions enable row level security;
alter table todos enable row level security;
alter table sections enable row level security;
alter table life_goals enable row level security;
alter table yearly_goals enable row level security;
alter table quarterly_goals enable row level security;
alter table journal_entries enable row level security;
alter table reading_notes enable row level security;
alter table friends enable row level security;
alter table friend_connections enable row level security;
alter table cookie_jar enable row level security;

-- Create policies to allow all operations (no auth for now)
create policy "Allow all" on routines for all using (true) with check (true);
create policy "Allow all" on completions for all using (true) with check (true);
create policy "Allow all" on todos for all using (true) with check (true);
create policy "Allow all" on sections for all using (true) with check (true);
create policy "Allow all" on life_goals for all using (true) with check (true);
create policy "Allow all" on yearly_goals for all using (true) with check (true);
create policy "Allow all" on quarterly_goals for all using (true) with check (true);
create policy "Allow all" on journal_entries for all using (true) with check (true);
create policy "Allow all" on reading_notes for all using (true) with check (true);
create policy "Allow all" on friends for all using (true) with check (true);
create policy "Allow all" on friend_connections for all using (true) with check (true);
create policy "Allow all" on cookie_jar for all using (true) with check (true);
