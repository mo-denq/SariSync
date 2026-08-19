-- QUERY: Phase 10 - Connect Profile, Categories, and Devices
-- DESCRIPTION:
-- Adds protected database functions used by SariSync's connected Settings
-- screens. The functions determine the signed-in person through auth.uid().
-- They do not expose service-role access to the browser.
--
-- WHAT THIS ENABLES:
-- 1. A person can read and save their own profile name/mobile number.
-- 2. An active store owner can add, rename, reorder, and archive categories.
-- 3. Each browser/phone can register a device nickname, limited to five active
--    devices per store. Product price updates can then record that device ID.
--
-- EMAIL AND PASSWORD NOTE:
-- Email/password are Supabase Authentication data. This query deliberately
-- does not edit them; changing an email belongs in a later Auth screen.

begin;

-- PROFILE: read the signed-in person's own visible profile.
create or replace function public.get_my_profile()
returns table (
  full_name text,
  mobile_number text,
  email text,
  photo_url text
)
language sql
security definer
set search_path = ''
as $$
  select p.full_name, p.mobile_number, p.email, p.photo_url
  from public.profiles as p
  where p.id = (select auth.uid())
  limit 1;
$$;

-- PROFILE: save only the signed-in person's display information.
create or replace function public.update_my_profile(
  p_full_name text,
  p_mobile_number text default null
)
returns table (
  full_name text,
  mobile_number text,
  email text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_full_name, ''));
begin
  if v_user_id is null then
    raise exception 'You must be signed in to update your profile.';
  end if;

  if v_name = '' then
    raise exception 'Enter your full name.';
  end if;

  update public.profiles
  set full_name = v_name,
      mobile_number = nullif(btrim(coalesce(p_mobile_number, '')), '')
  where id = v_user_id;

  if not found then
    raise exception 'Your profile was not found. Sign in again and try again.';
  end if;

  return query
  select p.full_name, p.mobile_number, p.email
  from public.profiles as p
  where p.id = v_user_id;
end;
$$;

-- CATEGORY: returns all categories, including archived ones, to the owner.
create or replace function public.get_my_owner_categories()
returns table (
  id uuid,
  name text,
  display_order integer,
  is_active boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
begin
  select m.store_id into v_store_id
  from public.store_members as m
  where m.user_id = (select auth.uid())
    and m.role = 'owner'
    and m.status = 'active'
  order by m.joined_at
  limit 1;

  if v_store_id is null then
    raise exception 'Only the active store owner can manage categories.';
  end if;

  return query
  select c.id, c.name, c.display_order, c.is_active
  from public.categories as c
  where c.store_id = v_store_id
  order by c.is_active desc, c.display_order, c.name;
end;
$$;

-- CATEGORY: create or edit one owner-owned category.
-- Names are trimmed and saved in UPPERCASE, matching product/category sorting.
create or replace function public.save_category_for_current_owner(
  p_category_id uuid default null,
  p_name text default null,
  p_display_order integer default 0,
  p_is_active boolean default true
)
returns table (
  id uuid,
  name text,
  display_order integer,
  is_active boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_name text := upper(btrim(coalesce(p_name, '')));
begin
  select m.store_id into v_store_id
  from public.store_members as m
  where m.user_id = (select auth.uid())
    and m.role = 'owner'
    and m.status = 'active'
  order by m.joined_at
  limit 1;

  if v_store_id is null then
    raise exception 'Only the active store owner can manage categories.';
  end if;
  if v_name = '' then
    raise exception 'Enter a category name.';
  end if;
  if coalesce(p_display_order, 0) < 0 then
    raise exception 'Display order cannot be negative.';
  end if;

  if p_category_id is null then
    insert into public.categories (store_id, name, display_order, is_active)
    values (v_store_id, v_name, coalesce(p_display_order, 0), coalesce(p_is_active, true))
    returning categories.id, categories.name, categories.display_order, categories.is_active
    into id, name, display_order, is_active;
  else
    update public.categories as c
    set name = v_name,
        display_order = coalesce(p_display_order, c.display_order),
        is_active = coalesce(p_is_active, c.is_active)
    where c.id = p_category_id
      and c.store_id = v_store_id
    returning c.id, c.name, c.display_order, c.is_active
    into id, name, display_order, is_active;

    if not found then
      raise exception 'That category was not found in your store.';
    end if;
  end if;

  return next;
end;
$$;

-- DEVICE: creates this device once, then reuses it on later saves.
create or replace function public.register_current_device(
  p_device_id uuid default null,
  p_nickname text default null
)
returns table (
  id uuid,
  nickname text,
  is_active boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_store_id uuid;
  v_nickname text := btrim(coalesce(p_nickname, ''));
  v_active_count integer;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to register a device.';
  end if;
  if v_nickname = '' then
    raise exception 'Enter a device nickname.';
  end if;

  select m.store_id into v_store_id
  from public.store_members as m
  where m.user_id = v_user_id and m.status = 'active'
  order by m.joined_at
  limit 1;
  if v_store_id is null then
    raise exception 'Your account is not connected to an active store.';
  end if;

  if p_device_id is not null then
    update public.devices as d
    set nickname = v_nickname,
        last_active_at = now(),
        is_active = true
    where d.id = p_device_id
      and d.store_id = v_store_id
      and d.user_id = v_user_id
    returning d.id, d.nickname, d.is_active into id, nickname, is_active;

    if found then
      return next;
      return;
    end if;
  end if;

  select count(*) into v_active_count
  from public.devices as d
  where d.store_id = v_store_id and d.is_active = true;
  if v_active_count >= 5 then
    raise exception 'This store already has five active devices.';
  end if;

  insert into public.devices (store_id, user_id, nickname, last_active_at, is_active)
  values (v_store_id, v_user_id, v_nickname, now(), true)
  returning devices.id, devices.nickname, devices.is_active into id, nickname, is_active;
  return next;
end;
$$;

revoke all on function public.get_my_profile() from public, anon;
revoke all on function public.update_my_profile(text, text) from public, anon;
revoke all on function public.get_my_owner_categories() from public, anon;
revoke all on function public.save_category_for_current_owner(uuid, text, integer, boolean) from public, anon;
revoke all on function public.register_current_device(uuid, text) from public, anon;

grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.update_my_profile(text, text) to authenticated;
grant execute on function public.get_my_owner_categories() to authenticated;
grant execute on function public.save_category_for_current_owner(uuid, text, integer, boolean) to authenticated;
grant execute on function public.register_current_device(uuid, text) to authenticated;

commit;
