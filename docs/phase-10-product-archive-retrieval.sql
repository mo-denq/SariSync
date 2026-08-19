-- QUERY: Phase 10 - Archived Product Retrieval and Restore
-- DESCRIPTION:
-- Keeps archived products out of normal Price Pulse and Updates views, while
-- letting only the active store owner list and restore them from Settings.
-- Products are never permanently deleted by this feature.

begin;

-- Owner-only list for the Settings > Archived products page.
create or replace function public.get_my_archived_products_for_current_owner()
returns table (
  product_id uuid,
  item_name text,
  category_id uuid,
  category_name text,
  barcode text,
  cost_price numeric,
  retail_price numeric,
  wholesale_price numeric,
  bottle_deposit numeric,
  notes text,
  archived_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_store_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to view archived products.';
  end if;

  select membership.store_id
  into v_store_id
  from public.store_members as membership
  where membership.user_id = v_user_id
    and membership.role = 'owner'
    and membership.status = 'active'
  order by membership.joined_at
  limit 1;

  if v_store_id is null then
    raise exception 'Only the store owner can view archived products.';
  end if;

  return query
  select
    product.id,
    product.item_name,
    product.category_id,
    category.name,
    product.barcode,
    product.cost_price,
    product.retail_price,
    product.wholesale_price,
    product.bottle_deposit,
    product.notes,
    product.updated_at
  from public.products as product
  join public.categories as category
    on category.id = product.category_id
  where product.store_id = v_store_id
    and product.is_active = false
  order by product.updated_at desc, product.item_name;
end;
$$;

-- Owner-only restore action. A product can return only when its category is
-- active too, so an inactive category never reappears in new-product choices.
create or replace function public.restore_product_for_current_owner(
  p_product_id uuid
)
returns table (
  product_id uuid,
  restored_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_store_id uuid;
  v_category_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in before restoring a product.';
  end if;

  if p_product_id is null then
    raise exception 'Choose a product to restore.';
  end if;

  select product.store_id, product.category_id
  into v_store_id, v_category_id
  from public.products as product
  where product.id = p_product_id
    and product.is_active = false
  for update;

  if v_store_id is null then
    raise exception 'Product was not found or is already active.';
  end if;

  if not exists (
    select 1
    from public.store_members as membership
    where membership.store_id = v_store_id
      and membership.user_id = v_user_id
      and membership.role = 'owner'
      and membership.status = 'active'
  ) then
    raise exception 'Only the store owner can restore products.';
  end if;

  if not exists (
    select 1
    from public.categories as category
    where category.id = v_category_id
      and category.store_id = v_store_id
      and category.is_active = true
  ) then
    raise exception 'Restore this product''s category before restoring the product.';
  end if;

  update public.products as product
  set
    is_active = true,
    updated_by = v_user_id,
    updated_at = now()
  where product.id = p_product_id;

  return query
  select p_product_id, now();
end;
$$;

-- Keep the normal Recent Updates screen focused on active products. Archived
-- products still keep their private database history, but no longer appear
-- in daily operational screens.
create or replace function public.get_my_recent_price_updates()
returns table (
  price_update_id uuid,
  product_id uuid,
  product_name text,
  previous_retail_price numeric,
  new_retail_price numeric,
  previous_wholesale_price numeric,
  new_wholesale_price numeric,
  change_note text,
  updated_by_name text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_store_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to view price updates.';
  end if;

  select membership.store_id
  into v_store_id
  from public.store_members as membership
  where membership.user_id = v_user_id
    and membership.status = 'active'
  order by membership.joined_at
  limit 1;

  if v_store_id is null then
    raise exception 'Your account is not connected to an active store.';
  end if;

  return query
  select
    update_record.id,
    update_record.product_id,
    product.item_name,
    update_record.previous_retail_price,
    update_record.new_retail_price,
    update_record.previous_wholesale_price,
    update_record.new_wholesale_price,
    update_record.notes,
    coalesce(profile.full_name, 'Store member'),
    update_record.created_at
  from public.price_updates as update_record
  join public.products as product
    on product.id = update_record.product_id
  left join public.profiles as profile
    on profile.id = update_record.updated_by_user_id
  where update_record.store_id = v_store_id
    and product.is_active = true
  order by update_record.created_at desc
  limit 12;
end;
$$;

revoke all on function public.get_my_archived_products_for_current_owner() from public, anon;
revoke all on function public.restore_product_for_current_owner(uuid) from public, anon;
grant execute on function public.get_my_archived_products_for_current_owner() to authenticated;
grant execute on function public.restore_product_for_current_owner(uuid) to authenticated;

commit;
