-- SariSync Phase 11: Enable Supabase Realtime for the shared price book.
-- PURPOSE:
--   Makes database changes to these existing tables available to the browser's
--   store-scoped live subscription: products, price_updates, and categories.
-- SAFETY:
--   This does not change product data, accounts, RLS policies, or permissions.
--   It can be run again safely: each table is added only if it is not already
--   in the existing supabase_realtime publication.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'price_updates'
  ) then
    alter publication supabase_realtime add table public.price_updates;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
end;
$$;

-- Verification: this should return exactly these three table names.
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in ('products', 'price_updates', 'categories')
order by tablename;
