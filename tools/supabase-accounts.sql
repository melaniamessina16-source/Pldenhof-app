-- Accounts, login sessions and quiz scores for the Oldenhof web app.
-- Run once in the Supabase SQL editor, after supabase-setup.sql. Safe to run again.
-- PINs are stored only as bcrypt hashes. The tables cannot be read directly from the app:
-- everything goes through the functions below, which check the team code and the login.

create extension if not exists pgcrypto with schema extensions;

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  work_id text not null default '',
  role text not null check (role in ('employee', 'boss', 'developer')),
  photo text,
  pin_hash text not null,
  failed int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create table if not exists sessions (
  token uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists quiz_results (
  id uuid primary key,
  account_id uuid not null,
  account_name text not null,
  quiz_id text not null,
  score int not null,
  total int not null,
  created_at timestamptz not null default now()
);
alter table accounts enable row level security;
alter table sessions enable row level security;
alter table quiz_results enable row level security;
-- (no policies on these three: the app can only reach them through the functions)

-- who wrote a note / reported a flag, and the optional comment on a flag
alter table notes add column if not exists account_id text;
alter table stock_flags add column if not exists account_id text;
alter table stock_flags add column if not exists comment text;

create or replace function acc_json(a accounts) returns json language sql stable as $$
  select json_build_object('id', a.id, 'name', a.name, 'workID', a.work_id, 'role', a.role, 'photo', a.photo, 'updatedAt', a.updated_at)
$$;

-- the logged-in account for a session token (null if the token is unknown or the account was deleted)
create or replace function session_account(p_token uuid) returns accounts
language sql stable security definer set search_path = public as $$
  select a.* from sessions s join accounts a on a.id = s.account_id
  where s.token = p_token and not a.deleted and team_ok()
$$;
revoke execute on function session_account(uuid) from public, anon, authenticated;

create or replace function account_list() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(acc_json(a) order by a.name), '[]'::json) from accounts a where not a.deleted and team_ok()
$$;

create or replace function create_first_developer(p_name text, p_work_id text, p_pin text, p_photo text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare a accounts; t uuid;
begin
  if not team_ok() then return json_build_object('error', 'teamcode'); end if;
  perform pg_advisory_xact_lock(42);
  if exists (select 1 from accounts where not deleted) then return json_build_object('error', 'exists'); end if;
  if p_pin !~ '^[0-9]{4}$' or coalesce(trim(p_name), '') = '' then return json_build_object('error', 'invalid'); end if;
  insert into accounts (name, work_id, role, photo, pin_hash)
    values (trim(p_name), coalesce(trim(p_work_id), ''), 'developer', p_photo, crypt(p_pin, gen_salt('bf')))
    returning * into a;
  insert into sessions (account_id) values (a.id) returning token into t;
  return json_build_object('token', t, 'account', acc_json(a));
end $$;

create or replace function log_in(p_id uuid, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare a accounts; t uuid;
begin
  if not team_ok() then return json_build_object('error', 'teamcode'); end if;
  select * into a from accounts where id = p_id and not deleted for update;
  if not found then return json_build_object('error', 'unknown'); end if;
  if a.locked_until is not null and a.locked_until > now() then
    return json_build_object('error', 'locked', 'until', a.locked_until);
  end if;
  if a.pin_hash <> crypt(coalesce(p_pin, ''), a.pin_hash) then
    -- 5 wrong PINs in a row: locked for 5 minutes
    update accounts set
      locked_until = case when failed + 1 >= 5 then now() + interval '5 minutes' else null end,
      failed = case when failed + 1 >= 5 then 0 else failed + 1 end
    where id = a.id;
    return json_build_object('error', 'wrong_pin');
  end if;
  update accounts set failed = 0, locked_until = null where id = a.id;
  insert into sessions (account_id) values (a.id) returning token into t;
  return json_build_object('token', t, 'account', acc_json(a));
end $$;

create or replace function me(p_token uuid) returns json
language sql stable security definer set search_path = public as $$
  select acc_json(a) from session_account(p_token) a where a.id is not null
$$;

create or replace function log_out(p_token uuid) returns void
language sql security definer set search_path = public as $$
  delete from sessions where token = p_token
$$;

-- create (p_id null) or edit an account. Developer: everything. Boss: employees, and their own name/photo/PIN.
create or replace function save_account(p_token uuid, p_id uuid, p_name text, p_work_id text, p_role text, p_pin text, p_photo text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare me accounts; target accounts; a accounts;
begin
  me := session_account(p_token);
  if me.id is null then return json_build_object('error', 'login'); end if;
  if me.role = 'employee' then return json_build_object('error', 'forbidden'); end if;
  if coalesce(trim(p_name), '') = '' or p_role not in ('employee', 'boss', 'developer') then return json_build_object('error', 'invalid'); end if;
  if p_pin is not null and p_pin !~ '^[0-9]{4}$' then return json_build_object('error', 'invalid'); end if;
  if p_id is null then
    if me.role = 'boss' and p_role <> 'employee' then return json_build_object('error', 'forbidden'); end if;
    if p_pin is null then return json_build_object('error', 'invalid'); end if;
    insert into accounts (name, work_id, role, photo, pin_hash)
      values (trim(p_name), coalesce(trim(p_work_id), ''), p_role, p_photo, crypt(p_pin, gen_salt('bf')))
      returning * into a;
  else
    select * into target from accounts where id = p_id and not deleted;
    if not found then return json_build_object('error', 'unknown'); end if;
    if me.role = 'boss' and target.id <> me.id and target.role <> 'employee' then return json_build_object('error', 'forbidden'); end if;
    -- nobody changes their own role; a boss only gives the employee role
    if target.id = me.id then p_role := target.role;
    elsif me.role = 'boss' then p_role := 'employee'; end if;
    update accounts set name = trim(p_name), work_id = coalesce(trim(p_work_id), ''), role = p_role, photo = p_photo,
      pin_hash = case when p_pin is null then pin_hash else crypt(p_pin, gen_salt('bf')) end,
      failed = 0, locked_until = null, updated_at = now()
      where id = p_id returning * into a;
  end if;
  return json_build_object('account', acc_json(a));
end $$;

create or replace function delete_account(p_token uuid, p_id uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me accounts; target accounts;
begin
  me := session_account(p_token);
  if me.id is null then return json_build_object('error', 'login'); end if;
  select * into target from accounts where id = p_id and not deleted;
  if not found then return json_build_object('error', 'unknown'); end if;
  if target.id = me.id or me.role = 'employee' or (me.role = 'boss' and target.role <> 'employee') then
    return json_build_object('error', 'forbidden');
  end if;
  update accounts set deleted = true, updated_at = now() where id = p_id;
  delete from sessions where account_id = p_id;
  return json_build_object('ok', true);
end $$;

create or replace function add_quiz_result(p_token uuid, p_id uuid, p_quiz_id text, p_score int, p_total int, p_at timestamptz) returns json
language plpgsql security definer set search_path = public as $$
declare me accounts;
begin
  me := session_account(p_token);
  if me.id is null then return json_build_object('error', 'login'); end if;
  insert into quiz_results (id, account_id, account_name, quiz_id, score, total, created_at)
    values (p_id, me.id, me.name, p_quiz_id, p_score, p_total, coalesce(p_at, now()))
    on conflict (id) do nothing;
  return json_build_object('ok', true);
end $$;

-- own results for everyone; all results for boss and developer
create or replace function quiz_results_for(p_token uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare me accounts;
begin
  me := session_account(p_token);
  if me.id is null then return json_build_object('error', 'login'); end if;
  return json_build_object('results', (select coalesce(json_agg(json_build_object('id', r.id, 'accountID', r.account_id,
      'accountName', r.account_name, 'quizID', r.quiz_id, 'score', r.score, 'total', r.total, 'date', r.created_at)
      order by r.created_at desc), '[]'::json)
    from quiz_results r where me.role <> 'employee' or r.account_id = me.id));
end $$;

grant execute on function account_list(), create_first_developer(text, text, text, text), log_in(uuid, text), me(uuid),
  log_out(uuid), save_account(uuid, uuid, text, text, text, text, text), delete_account(uuid, uuid),
  add_quiz_result(uuid, uuid, text, int, int, timestamptz), quiz_results_for(uuid) to anon;
