-- Product texts changed in the app by the developer or a boss.
-- Run once in the Supabase SQL editor, after supabase-setup.sql and supabase-accounts.sql. Safe to run again.
-- Everyone with the team code can read the changed texts; only a logged-in developer or boss can change them,
-- and only through save_product_text (the table itself cannot be written from the app).

create table if not exists product_texts (
  product_id text primary key,
  suited_for text,
  bullets jsonb not null default '[]'::jsonb,
  author text,
  account_id uuid,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
alter table product_texts enable row level security;
drop policy if exists texts_read on product_texts;
create policy texts_read on product_texts for select using (team_ok());

-- p_reset = true puts the website text back (the row is kept as deleted so every phone picks up the change)
create or replace function save_product_text(p_token uuid, p_product_id text, p_suited text, p_bullets jsonb, p_reset boolean)
returns json language plpgsql security definer set search_path = public as $$
declare me accounts; r product_texts;
begin
  me := session_account(p_token);
  if me.id is null then return json_build_object('error', 'login'); end if;
  if me.role = 'employee' then return json_build_object('error', 'forbidden'); end if;
  if coalesce(trim(p_product_id), '') = '' then return json_build_object('error', 'invalid'); end if;
  if not coalesce(p_reset, false) and (p_bullets is null or jsonb_typeof(p_bullets) <> 'array' or jsonb_array_length(p_bullets) = 0) then
    return json_build_object('error', 'invalid'); end if;
  insert into product_texts (product_id, suited_for, bullets, author, account_id, updated_at, deleted)
    values (p_product_id, nullif(trim(coalesce(p_suited, '')), ''), coalesce(p_bullets, '[]'::jsonb), me.name, me.id, now(), coalesce(p_reset, false))
    on conflict (product_id) do update set suited_for = excluded.suited_for, bullets = excluded.bullets, author = excluded.author,
      account_id = excluded.account_id, updated_at = excluded.updated_at, deleted = excluded.deleted
    returning * into r;
  return json_build_object('productID', r.product_id, 'suitedFor', r.suited_for, 'bullets', r.bullets, 'author', r.author,
    'accountID', r.account_id, 'updatedAt', r.updated_at, 'deleted', r.deleted);
end $$;
revoke execute on function save_product_text(uuid, text, text, jsonb, boolean) from public;
grant execute on function save_product_text(uuid, text, text, jsonb, boolean) to anon;
grant select on product_texts to anon;
