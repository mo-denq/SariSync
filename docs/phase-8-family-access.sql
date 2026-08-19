/*
  FILE: docs/phase-8-family-access.sql
  PURPOSE: Adds the protected Family Access reader and strengthens the existing
  Join Store function with SariSync's five-active-account limit.

  REVIEW-ONLY DRAFT — DO NOT RUN UNTIL YOU HAVE READ AND APPROVED IT.

  WHAT THIS CHANGES WHEN YOU LATER RUN IT IN SUPABASE:
  1. Adds get_my_family_access(), which returns only the current signed-in
     user's store and the active members of that same store.
  2. Replaces join_store_for_current_user() with a safer version that allows a
     maximum of five active accounts in one store.
  3. Keeps the existing stores, profiles, and store_members rows. It does not
     delete, rename, or replace any store data.

  SECURITY:
  - Both functions identify the caller with auth.uid().
  - A caller cannot supply or impersonate another user_id.
  - The caller's store is taken from store_members, not browser metadata.
  - The functions use a fixed, empty search_path and fully qualified names.
  - PUBLIC and anon execution are revoked; authenticated users receive only
    the function access required by the browser workflow.
  - RLS remains enabled on every table. No RLS setting is changed here.
*/

begin;

create or replace function public.get_my_family_access()
returns table (
  store_id uuid,
  store_name text,
  store_code text,
  viewer_role text,
  member_user_id uuid,
  member_name text,
  member_email text,
  member_role text,
  member_status text,
  member_joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with current_membership as (
    select
      public.store_members.store_id,
      public.store_members.role as viewer_role
    from public.store_members
    where public.store_members.user_id = (select auth.uid())
      and public.store_members.status = 'active'
    order by public.store_members.joined_at
    limit 1
  )
  select
    public.stores.id as store_id,
    public.stores.store_name,
    public.stores.store_code,
    current_membership.viewer_role,
    public.store_members.user_id as member_user_id,
    public.profiles.full_name as member_name,
    public.profiles.email as member_email,
    public.store_members.role as member_role,
    public.store_members.status as member_status,
    public.store_members.joined_at as member_joined_at
  from current_membership
  join public.stores
    on public.stores.id = current_membership.store_id
  join public.store_members
    on public.store_members.store_id = current_membership.store_id
   and public.store_members.status = 'active'
  join public.profiles
    on public.profiles.id = public.store_members.user_id
  where (select auth.uid()) is not null
  order by
    case when public.store_members.role = 'owner' then 0 else 1 end,
    public.store_members.joined_at;
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
  v_existing_status text;
  v_active_account_count bigint;
begin
  if v_user_id is null then
    raise exception 'You must be signed in before joining a store.';
  end if;

  if v_normalized_code = '' then
    raise exception 'Enter a store code.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where public.profiles.id = v_user_id
  ) then
    raise exception 'Your SariSync profile is not ready yet. Please sign in again.';
  end if;

  if exists (
    select 1
    from public.store_members
    where public.store_members.user_id = v_user_id
      and public.store_members.status = 'active'
  ) then
    raise exception 'This account already belongs to an active store.';
  end if;

  select public.stores.id, public.stores.store_name
  into v_store_id, v_store_name
  from public.stores
  where public.stores.store_code = v_normalized_code;

  if v_store_id is null then
    raise exception 'That store code was not found. Check the code and try again.';
  end if;

  /* Lock this one store while counting and joining. This prevents two people
     from joining at the same instant and accidentally exceeding five. */
  perform 1
  from public.stores
  where public.stores.id = v_store_id
  for update;

  select public.store_members.status
  into v_existing_status
  from public.store_members
  where public.store_members.store_id = v_store_id
    and public.store_members.user_id = v_user_id;

  if v_existing_status = 'removed' then
    raise exception 'Your access to this store was removed. Ask the store owner for help.';
  end if;

  select count(*)
  into v_active_account_count
  from public.store_members
  where public.store_members.store_id = v_store_id
    and public.store_members.status = 'active';

  if v_active_account_count >= 5 then
    raise exception 'This store already has five active accounts. Ask the owner to remove a member before joining.';
  end if;

  if v_existing_status = 'invited' then
    update public.store_members
    set
      role = 'member',
      status = 'active',
      joined_at = now()
    where public.store_members.store_id = v_store_id
      and public.store_members.user_id = v_user_id;
  else
    insert into public.store_members (store_id, user_id, role, status)
    values (v_store_id, v_user_id, 'member', 'active');
  end if;

  return query
  select v_store_id, v_store_name, v_normalized_code, 'member'::text;
end;
$$;

revoke all on function public.get_my_family_access() from public, anon, authenticated;
revoke all on function public.join_store_for_current_user(text) from public, anon, authenticated;

grant execute on function public.get_my_family_access() to authenticated;
grant execute on function public.join_store_for_current_user(text) to authenticated;

commit;
