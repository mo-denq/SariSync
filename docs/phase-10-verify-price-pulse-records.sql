-- QUERY: Phase 10 - Verify Price Pulse Records
-- DESCRIPTION:
-- Read-only check. Shows the newest saved price-change records together with
-- their product names. It does not add, edit, archive, or delete anything.

select
  product.item_name as product_name,
  update_record.previous_retail_price,
  update_record.new_retail_price,
  update_record.previous_wholesale_price,
  update_record.new_wholesale_price,
  profile.full_name as updated_by,
  update_record.created_at as updated_at
from public.price_updates as update_record
join public.products as product
  on product.id = update_record.product_id
left join public.profiles as profile
  on profile.id = update_record.updated_by_user_id
order by update_record.created_at desc
limit 10;
