-- QUERY: Phase 10 - Load My Recent Price Updates
-- DESCRIPTION:
-- Lets the signed-in person read the newest price changes for their own
-- active store only. Home uses these records for Price Pulse.
-- This query does not change products, prices, or memberships.

begin;

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
  order by update_record.created_at desc
  limit 12;
end;
$$;

-- The function is not public. Only signed-in users may call it, and its
-- internal membership check keeps every store's updates separate.
revoke all on function public.get_my_recent_price_updates() from public, anon;
grant execute on function public.get_my_recent_price_updates() to authenticated;

commit;
