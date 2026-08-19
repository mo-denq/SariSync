-- QUERY: Phase 10 - Repair CSV Import Function
-- DESCRIPTION:
-- Replaces only the CSV import instruction. It does not delete or change
-- existing tables, products, categories, accounts, or store memberships.
--
-- WHY THIS IS NEEDED:
-- The earlier import function ran with the caller's normal table access,
-- so Row Level Security stopped it while checking store_members. This version
-- uses secure database access, but first verifies auth.uid() and confirms
-- that the signed-in person is the active owner of exactly their own store.

create or replace function public.import_csv_products_for_current_owner(
  p_rows jsonb
)
returns table (
  inserted_count integer,
  skipped_duplicate_barcode_count integer,
  created_category_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_store_id uuid;
  v_row jsonb;
  v_category_id uuid;
  v_item_name text;
  v_category_name text;
  v_barcode text;
  v_cost_price numeric;
  v_retail_price numeric;
  v_wholesale_price numeric;
  v_bottle_deposit numeric;
  v_notes text;
  v_inserted_count integer := 0;
  v_skipped_duplicate_barcode_count integer := 0;
  v_created_category_count integer := 0;
begin
  -- The request must come from a real signed-in SariSync account.
  if v_user_id is null then
    raise exception 'You must be signed in before importing a price list.';
  end if;

  -- Only the active owner of their own store can run a bulk CSV import.
  select membership.store_id
  into v_store_id
  from public.store_members as membership
  where membership.user_id = v_user_id
    and membership.role = 'owner'
    and membership.status = 'active'
  order by membership.joined_at
  limit 1;

  if v_store_id is null then
    raise exception 'Only the active store owner can import a price list.';
  end if;

  if p_rows is null
     or jsonb_typeof(p_rows) <> 'array'
     or jsonb_array_length(p_rows) = 0 then
    raise exception 'Choose a CSV file with at least one product row.';
  end if;

  for v_row in
    select value from jsonb_array_elements(p_rows)
  loop
    -- The browser already validates each row. These checks protect the data
    -- again at the database level in case another client calls this function.
    v_item_name := upper(btrim(coalesce(v_row ->> 'item name', '')));
    v_category_name := upper(btrim(coalesce(v_row ->> 'category', '')));
    v_barcode := nullif(btrim(coalesce(v_row ->> 'barcode', '')), '');
    v_cost_price := nullif(btrim(coalesce(v_row ->> 'cost price', '')), '')::numeric;
    v_retail_price := nullif(btrim(coalesce(v_row ->> 'retail price', '')), '')::numeric;
    v_wholesale_price := nullif(btrim(coalesce(v_row ->> 'wholesale price', '')), '')::numeric;
    v_bottle_deposit := nullif(btrim(coalesce(v_row ->> 'bottle deposit', '')), '')::numeric;
    v_notes := nullif(btrim(coalesce(v_row ->> 'notes', '')), '');

    if v_item_name = '' or v_category_name = '' then
      raise exception 'Each imported product needs an item name and category.';
    end if;

    if v_retail_price is null or v_retail_price < 0
       or (v_cost_price is not null and v_cost_price < 0)
       or (v_wholesale_price is not null and v_wholesale_price < 0)
       or (v_bottle_deposit is not null and v_bottle_deposit < 0) then
      raise exception 'Imported prices cannot be blank or negative.';
    end if;

    -- Blank barcodes are allowed. A non-blank barcode may appear only once
    -- in the same store, so repeated barcode rows are skipped safely.
    if v_barcode is not null and exists (
      select 1
      from public.products as product
      where product.store_id = v_store_id
        and product.barcode = v_barcode
    ) then
      v_skipped_duplicate_barcode_count := v_skipped_duplicate_barcode_count + 1;
      continue;
    end if;

    -- Categories belong to one store. Create a missing category, otherwise
    -- reuse the existing category ID so products remain consistently grouped.
    select category.id
    into v_category_id
    from public.categories as category
    where category.store_id = v_store_id
      and category.name = v_category_name
    limit 1;

    if v_category_id is null then
      insert into public.categories (
        store_id,
        name,
        display_order,
        is_active
      )
      values (
        v_store_id,
        v_category_name,
        coalesce(
          (
            select max(category.display_order) + 1
            from public.categories as category
            where category.store_id = v_store_id
          ),
          0
        ),
        true
      )
      returning id into v_category_id;

      v_created_category_count := v_created_category_count + 1;
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
      v_category_id,
      v_cost_price,
      v_retail_price,
      v_wholesale_price,
      v_bottle_deposit,
      v_notes,
      v_user_id,
      v_user_id,
      now(),
      now(),
      true
    );

    v_inserted_count := v_inserted_count + 1;
  end loop;

  return query
  select
    v_inserted_count,
    v_skipped_duplicate_barcode_count,
    v_created_category_count;
end;
$$;

-- A public function is callable by default. Allow only signed-in accounts;
-- the owner check inside the function is what decides who may import.
revoke all on function public.import_csv_products_for_current_owner(jsonb)
  from public, anon;
grant execute on function public.import_csv_products_for_current_owner(jsonb)
  to authenticated;
