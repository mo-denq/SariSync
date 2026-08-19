-- QUERY: Phase 10 - Add Product for Current User
-- DESCRIPTION:
-- Creates one real product from the Add Product screen.
-- It does not delete or edit any existing product, category, account, or store.
--
-- ACCESS RULE:
-- An active owner OR active member may add a product only to their own store.
-- The selected category must be an active category belonging to that same store.

create or replace function public.add_product_for_current_user(
  p_item_name text,
  p_category_id uuid,
  p_barcode text default null,
  p_cost_price numeric default null,
  p_retail_price numeric default null,
  p_wholesale_price numeric default null,
  p_bottle_deposit numeric default null,
  p_notes text default null
)
returns table (
  product_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_store_id uuid;
  v_product_id uuid;
  v_item_name text := upper(btrim(coalesce(p_item_name, '')));
  v_barcode text := nullif(btrim(coalesce(p_barcode, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_now timestamptz := now();
begin
  -- Require a real signed-in person.
  if v_user_id is null then
    raise exception 'You must be signed in before adding a product.';
  end if;

  -- Find the current person's active store membership.
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

  if v_item_name = '' then
    raise exception 'Enter a product name.';
  end if;

  if p_category_id is null or not exists (
    select 1
    from public.categories as category
    where category.id = p_category_id
      and category.store_id = v_store_id
      and category.is_active = true
  ) then
    raise exception 'Choose an active category from your store.';
  end if;

  if p_retail_price is null or p_retail_price < 0
     or (p_cost_price is not null and p_cost_price < 0)
     or (p_wholesale_price is not null and p_wholesale_price < 0)
     or (p_bottle_deposit is not null and p_bottle_deposit < 0) then
    raise exception 'Retail price is required. Prices cannot be negative.';
  end if;

  -- A blank barcode is allowed. A barcode must not be repeated in one store.
  if v_barcode is not null and exists (
    select 1
    from public.products as product
    where product.store_id = v_store_id
      and product.barcode = v_barcode
  ) then
    raise exception 'This barcode already belongs to a product in your store.';
  end if;

  insert into public.products (
    store_id,
    barcode,
    item_name,
    category_id,
    cost_price,
    retail_price,
    wholesale_price,
    bottle_deposit,
    notes,
    created_by,
    updated_by,
    created_at,
    updated_at,
    is_active
  )
  values (
    v_store_id,
    v_barcode,
    v_item_name,
    p_category_id,
    p_cost_price,
    p_retail_price,
    p_wholesale_price,
    p_bottle_deposit,
    v_notes,
    v_user_id,
    v_user_id,
    v_now,
    v_now,
    true
  )
  returning id into v_product_id;

  return query select v_product_id, v_now;
end;
$$;

-- Only signed-in accounts can call this function. The checks inside the
-- function decide which store and category they are allowed to use.
revoke all on function public.add_product_for_current_user(
  text, uuid, text, numeric, numeric, numeric, numeric, text
) from public, anon;

grant execute on function public.add_product_for_current_user(
  text, uuid, text, numeric, numeric, numeric, numeric, text
) to authenticated;
