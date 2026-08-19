-- QUERY: Phase 10 - Complete Category Management
-- DESCRIPTION:
-- Adds an owner-only category list that includes the number of active products
-- per category. It also improves duplicate-name messages before a category is
-- created or renamed. This query does not delete any categories or products.
--
-- Run this once in Supabase SQL Editor after reviewing it. A successful run
-- normally says: "Success. No rows returned."

begin;

-- Returns every category for the signed-in store owner, including archived
-- categories, plus the count used by the archive confirmation in the app.
create or replace function public.get_my_owner_categories_with_counts()
returns table (
  id uuid,
  name text,
  display_order integer,
  is_active boolean,
  active_product_count bigint
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
  select
    c.id,
    c.name,
    c.display_order,
    c.is_active,
    count(p.id) as active_product_count
  from public.categories as c
  left join public.products as p
    on p.category_id = c.id
   and p.store_id = c.store_id
   and p.is_active = true
  where c.store_id = v_store_id
  group by c.id, c.name, c.display_order, c.is_active
  order by upper(c.name);
end;
$$;

-- Keeps the existing owner-only save function, but gives a friendly duplicate
-- message after trimming spaces and converting the name to UPPERCASE.
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

  if exists (
    select 1
    from public.categories as c
    where c.store_id = v_store_id
      and c.name = v_name
      and (p_category_id is null or c.id <> p_category_id)
  ) then
    raise exception '% already exists in this store.', v_name;
  end if;

  if p_category_id is null then
    insert into public.categories (store_id, name, display_order, is_active)
    values (v_store_id, v_name, 0, coalesce(p_is_active, true))
    returning categories.id, categories.name, categories.display_order, categories.is_active
    into id, name, display_order, is_active;
  else
    update public.categories as c
    set name = v_name,
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

revoke all on function public.get_my_owner_categories_with_counts() from public, anon;
revoke all on function public.save_category_for_current_owner(uuid, text, integer, boolean) from public, anon;
grant execute on function public.get_my_owner_categories_with_counts() to authenticated;
grant execute on function public.save_category_for_current_owner(uuid, text, integer, boolean) to authenticated;

commit;
