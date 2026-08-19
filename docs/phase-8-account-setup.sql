/*
  FILE: docs/phase-8-account-setup.sql
  PURPOSE: Adds the protected Supabase functions used by the browser Account
  Setup screen.

  HOW TO USE:
  1. Read this file first.
  2. Paste it into a new Supabase SQL Editor query named
     "Phase 8 - Account Setup Functions".
  3. Run it once, then test the browser Create Store and Join Store screens.

  SECURITY:
  - No service-role key is used in the browser.
  - Each function checks auth.uid(), which is the current authenticated user.
  - A user cannot create a second active membership through these functions.
  - A user cannot supply another person's user ID.
*/

create or replace function public.get_my_store_access()
returns table (
  store_id uuid,
  store_name text,
  store_code text,
  role text,
  full_name text
)
language sql
security definer
set search_path = ''
as $$
  select
    store_members.store_id,
    stores.store_name,
    stores.store_code,
    store_members.role,
    profiles.full_name
  from public.store_members
  join public.stores on stores.id = store_members.store_id
  join public.profiles on profiles.id = store_members.user_id
  where store_members.user_id = (select auth.uid())
    and store_members.status = 'active'
  limit 1;
$$;

create or replace function public.create_store_for_current_user(
  p_store_name text,
  p_barangay text,
  p_city text,
  p_province text,
  p_street_address text default null
)
returns table (
  store_id uuid,
  store_name text,
  store_code text,
  role text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_store_id uuid;
  v_store_code text;
  v_prefix text;
begin
  if v_user_id is null then
    raise exception 'You must be signed in before creating a store.';
  end if;

  if btrim(coalesce(p_store_name, '')) = ''
     or btrim(coalesce(p_barangay, '')) = ''
     or btrim(coalesce(p_city, '')) = ''
     or btrim(coalesce(p_province, '')) = '' then
    raise exception 'Store name, barangay, city, and province are required.';
  end if;

  if not exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'Your SariSync profile is not ready yet. Please sign in again.';
  end if;

  if exists (
    select 1 from public.store_members
    where user_id = v_user_id and status = 'active'
  ) then
    raise exception 'This account already belongs to an active store.';
  end if;

  v_prefix := upper(left(regexp_replace(btrim(p_store_name), '[^A-Za-z0-9]', '', 'g'), 3));
  v_prefix := rpad(v_prefix, 3, 'X');

  loop
    v_store_id := gen_random_uuid();
    v_store_code := v_prefix || '-' || upper(left(replace(v_store_id::text, '-', ''), 8));
    exit when not exists (
      select 1 from public.stores where stores.store_code = v_store_code
    );
  end loop;

  insert into public.stores (
    id, store_code, store_name, barangay, city, province, street_address
  )
  values (
    v_store_id, v_store_code, btrim(p_store_name), btrim(p_barangay),
    btrim(p_city), btrim(p_province),
    nullif(btrim(coalesce(p_street_address, '')), '')
  );

  insert into public.store_members (store_id, user_id, role, status)
  values (v_store_id, v_user_id, 'owner', 'active');

  return query
  select v_store_id, btrim(p_store_name), v_store_code, 'owner'::text;
end;
$$;

create or replace function public.join_store_for_current_user(p_store_code text)
returns table (
  store_id uuid,
  store_name text,
  store_code text,
  role text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_store_id uuid;
  v_store_name text;
  v_normalized_code text := upper(btrim(coalesce(p_store_code, '')));
begin
  if v_user_id is null then
    raise exception 'You must be signed in before joining a store.';
  end if;

  if v_normalized_code = '' then
    raise exception 'Enter a store code.';
  end if;

  if not exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'Your SariSync profile is not ready yet. Please sign in again.';
  end if;

  if exists (
    select 1 from public.store_members
    where user_id = v_user_id and status = 'active'
  ) then
    raise exception 'This account already belongs to an active store.';
  end if;

  select id, stores.store_name
  into v_store_id, v_store_name
  from public.stores
  where stores.store_code = v_normalized_code;

  if v_store_id is null then
    raise exception 'That store code was not found. Check the code and try again.';
  end if;

  insert into public.store_members (store_id, user_id, role, status)
  values (v_store_id, v_user_id, 'member', 'active');

  return query
  select v_store_id, v_store_name, v_normalized_code, 'member'::text;
end;
$$;

revoke all on function public.get_my_store_access() from public, anon;
revoke all on function public.create_store_for_current_user(text, text, text, text, text) from public, anon;
revoke all on function public.join_store_for_current_user(text) from public, anon;

grant execute on function public.get_my_store_access() to authenticated;
grant execute on function public.create_store_for_current_user(text, text, text, text, text) to authenticated;
grant execute on function public.join_store_for_current_user(text) to authenticated;
