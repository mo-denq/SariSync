-- SariSync Phase 7 Schema Snapshot
-- Captured from the Supabase Schema Visualizer on 2026-08-07.
-- WARNING: This is a reference copy only. Do NOT run this file.
-- The visualizer does not guarantee executable table order or complete rules.

CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL DEFAULT gen_random_uuid(),
  barcode text,
  item_name text NOT NULL CHECK (item_name = upper(btrim(item_name)) AND item_name <> ''::text),
  category_id uuid NOT NULL,
  cost_price numeric CHECK (cost_price IS NULL OR cost_price >= 0::numeric),
  retail_price numeric NOT NULL CHECK (retail_price >= 0::numeric),
  wholesale_price numeric CHECK (wholesale_price IS NULL OR wholesale_price >= 0::numeric),
  bottle_deposit numeric CHECK (bottle_deposit IS NULL OR bottle_deposit >= 0::numeric),
  notes text,
  updated_by uuid NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  photo_url text,
  created_by uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL,
  is_active boolean NOT NULL,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT products_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id)
);

CREATE TABLE public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  store_code text NOT NULL UNIQUE,
  store_name text NOT NULL,
  barangay text NOT NULL,
  city text NOT NULL,
  province text NOT NULL,
  street_address text,
  photo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  updated_at timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  CONSTRAINT stores_pkey PRIMARY KEY (id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text NOT NULL,
  mobile_number text,
  email text NOT NULL UNIQUE,
  photo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL CHECK (name = upper(btrim(name)) AND name <> ''::text),
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);

CREATE TABLE public.store_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'member'::text])),
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'invited'::text, 'removed'::text])),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_members_pkey PRIMARY KEY (id),
  CONSTRAINT store_members_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT store_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  user_id uuid NOT NULL,
  nickname text NOT NULL CHECK (btrim(nickname) <> ''::text),
  last_active_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT devices_pkey PRIMARY KEY (id),
  CONSTRAINT devices_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.price_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  previous_retail_price numeric CHECK (previous_retail_price IS NULL OR previous_retail_price >= 0::numeric),
  new_retail_price numeric NOT NULL CHECK (new_retail_price >= 0::numeric),
  previous_wholesale_price numeric CHECK (previous_wholesale_price IS NULL OR previous_wholesale_price >= 0::numeric),
  new_wholesale_price numeric CHECK (new_wholesale_price IS NULL OR new_wholesale_price >= 0::numeric),
  updated_by_user_id uuid NOT NULL,
  device_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT price_updates_pkey PRIMARY KEY (id),
  CONSTRAINT price_updates_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT price_updates_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT price_updates_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES public.profiles(id),
  CONSTRAINT price_updates_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id)
);
