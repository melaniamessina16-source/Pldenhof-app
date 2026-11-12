-- Run once in the Supabase SQL editor. Replace CHANGE-ME with the team code (also put it in config.js).
create table if not exists notes (
  id uuid primary key,
  product_id text not null,
  variant_id text,
  text text not null,
  author text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create table if not exists stock_flags (
  variant_id text primary key,
  product_id text not null,
  out_of_stock boolean not null,
  author text,
  updated_at timestamptz not null default now()
);
alter table notes enable row level security;
alter table stock_flags enable row level security;

create or replace function team_ok() returns boolean language sql stable as $$
  select coalesce(current_setting('request.headers', true)::json->>'x-team-code', '') = 'CHANGE-ME'
$$;

drop policy if exists notes_read on notes;
create policy notes_read on notes       for select using (team_ok());
drop policy if exists notes_write on notes;
create policy notes_write on notes       for insert with check (team_ok());
drop policy if exists notes_update on notes;
create policy notes_update on notes       for update using (team_ok()) with check (team_ok());
drop policy if exists flags_read on stock_flags;
create policy flags_read on stock_flags for select using (team_ok());
drop policy if exists flags_write on stock_flags;
create policy flags_write on stock_flags for insert with check (team_ok());
drop policy if exists flags_update on stock_flags;
create policy flags_update on stock_flags for update using (team_ok()) with check (team_ok());
