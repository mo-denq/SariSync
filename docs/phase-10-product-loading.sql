-- QUERY: Phase 10 - Load My Active Price Book
-- DESCRIPTION:
-- A read-only function used by the SariSync browser app. It returns only the
-- current signed-in user's active store categories and active products.
-- It returns empty lists for a new store and never returns another store's data.

create or replace function public.get_my_active_price_book()
returns table (
  categories jsonb,
  products jsonb
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
    raise exception 'You must be signed in to view the price book.';
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
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', category.id,
            'name', category.name,
            'display_order', category.display_order
          )
          order by category.display_order, category.name
        )
        from public.categories as category
        where category.store_id = v_store_id
          and category.is_active = true
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', product.id,
            'barcode', product.barcode,
            'item_name', product.item_name,
            'category_id', product.category_id,
            'category_name', category.name,
            'cost_price', product.cost_price,
            'retail_price', product.retail_price,
            'wholesale_price', product.wholesale_price,
            'bottle_deposit', product.bottle_deposit,
            'notes', product.notes,
            'updated_by_name', coalesce(profile.full_name, 'Store member'),
            'updated_at', product.updated_at,
            'created_at', product.created_at
          )
          order by product.item_name
        )
        from public.products as product
        join public.categories as category
          on category.id = product.category_id
        left join public.profiles as profile
          on profile.id = product.updated_by
        where product.store_id = v_store_id
          and product.is_active = true
      ),
      '[]'::jsonb
    );
end;
$$;

-- A new function is callable by PUBLIC unless we remove that default access.
revoke all on function public.get_my_active_price_book() from public, anon;
grant execute on function public.get_my_active_price_book() to authenticated;
