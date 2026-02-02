create table if not exists error_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  category text not null,
  message text not null,
  detail text,
  created_at timestamptz default now()
);

alter table error_logs enable row level security;

create policy "Users can insert their own error logs"
  on error_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can read their own error logs"
  on error_logs for select
  using (auth.uid() = user_id);

create index idx_error_logs_user_id on error_logs(user_id);
create index idx_error_logs_created_at on error_logs(created_at);
