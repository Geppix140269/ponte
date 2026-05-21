-- Ponte Trade — database schema + RLS
-- Run in the Supabase SQL editor (or via the Supabase CLI migrations).

-- ============================================================ TABLES

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  company text,
  country text,
  role text default 'customer',          -- 'customer' | 'admin'
  stripe_customer_id text,
  created_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  display_order int
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  category_id uuid references categories,
  title text not null,
  slug text unique not null,
  short_description text,
  full_description text,
  price_cents int not null,
  currency text default 'EUR',
  delivery_type text not null,           -- 'instant' | '24h' | '48h' | 'custom'
  is_subscription bool default false,
  stripe_price_id text,
  preview_pages int default 3,
  preview_pdf_url text,
  full_pdf_template text,
  is_configurable bool default false,
  config_fields jsonb,
  status text default 'draft',           -- 'draft' | 'published' | 'archived'
  featured bool default false,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  stripe_payment_intent_id text unique,
  stripe_session_id text,
  status text default 'pending',         -- 'pending' | 'paid' | 'processing' | 'delivered' | 'failed'
  total_cents int,
  currency text default 'EUR',
  created_at timestamptz default now(),
  delivered_at timestamptz
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders on delete cascade,
  product_id uuid references products,
  quantity int default 1,
  unit_price_cents int,
  config_values jsonb,
  delivery_status text default 'pending',-- 'pending' | 'processing' | 'ready' | 'delivered'
  download_url text,
  download_expires_at timestamptz,
  download_count int default 0,
  max_downloads int default 5,
  created_at timestamptz default now()
);

create table if not exists order_notes (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid references order_items on delete cascade,
  note text,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists bundle_items (
  bundle_product_id uuid references products on delete cascade,
  component_product_id uuid references products on delete cascade,
  primary key (bundle_product_id, component_product_id)
);

create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  stripe_subscription_id text,
  status text default 'active',
  created_at timestamptz default now()
);

-- ============================================================ HELPERS

create or replace function is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a profile row when a new auth user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================ RLS

alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_notes enable row level security;
alter table bundle_items enable row level security;
alter table newsletter_subscribers enable row level security;

-- Catalogue is publicly readable (published rows); admins manage everything.
drop policy if exists "categories readable" on categories;
create policy "categories readable" on categories for select using (true);

drop policy if exists "products readable" on products;
create policy "products readable" on products
  for select using (status = 'published' or is_admin());

drop policy if exists "bundle_items readable" on bundle_items;
create policy "bundle_items readable" on bundle_items for select using (true);

drop policy if exists "admin manage categories" on categories;
create policy "admin manage categories" on categories
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin manage products" on products;
create policy "admin manage products" on products
  for all using (is_admin()) with check (is_admin());

-- Profiles: a user sees/edits their own; admins see all.
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for select using (id = auth.uid() or is_admin());

drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Orders & items: owner read; admins full. Writes happen via the
-- service-role key in server routes (bypasses RLS).
drop policy if exists "own orders" on orders;
create policy "own orders" on orders
  for select using (user_id = auth.uid() or is_admin());

drop policy if exists "own order items" on order_items;
create policy "own order items" on order_items
  for select using (
    is_admin() or exists (
      select 1 from orders o where o.id = order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "admin order notes" on order_notes;
create policy "admin order notes" on order_notes
  for all using (is_admin()) with check (is_admin());
