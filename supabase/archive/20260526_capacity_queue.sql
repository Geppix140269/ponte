-- Ponte Trade — Capacity Queue migration
-- Date: 2026-05-26
-- See docs/CAPACITY-QUEUE-DESIGN.md for the full design.
--
-- Adds:
--   products.capacity_kind   — which capacity pool this product consumes
--   orders.status_v2          — new lifecycle (authorized → confirmed → captured → delivered)
--   orders.confirmed_delivery_at — when admin promised the customer delivery by
--   orders.capture_deadline_at   — 7-day Stripe auth window deadline
--   orders.capture_method     — 'manual' | 'automatic'
--   order_items.slot_date     — the business day this item consumes capacity
--
-- Run in the Supabase SQL editor.
-- Safe to re-run: every alter table uses "if not exists" semantics
-- by checking information_schema first.

-- ============================================================ PRODUCTS

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'products' and column_name = 'capacity_kind'
  ) then
    alter table products
      add column capacity_kind text default 'standard' check (
        capacity_kind in ('instant','standard','custom','subscription')
      );
  end if;
end $$;

-- Backfill from existing delivery_type and is_subscription
update products
set capacity_kind = case
  when is_subscription then 'subscription'
  when delivery_type = 'instant' then 'instant'
  when delivery_type = 'custom' then 'custom'
  else 'standard'
end
where capacity_kind is null
   or capacity_kind = 'standard';  -- re-classify defaults

-- ============================================================ ORDERS

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'orders' and column_name = 'status_v2'
  ) then
    alter table orders
      add column status_v2 text default 'authorized' check (
        status_v2 in (
          'authorized',  -- card on hold, awaiting our confirmation
          'confirmed',   -- delivery date set, capture imminent
          'captured',    -- charged, in production
          'delivered',   -- shipped to customer
          'voided',      -- could not deliver, auth released
          'refunded'     -- post-delivery refund (rare)
        )
      );
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'orders' and column_name = 'confirmed_delivery_at'
  ) then
    alter table orders add column confirmed_delivery_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'orders' and column_name = 'capture_deadline_at'
  ) then
    alter table orders add column capture_deadline_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'orders' and column_name = 'capture_method'
  ) then
    alter table orders
      add column capture_method text default 'automatic' check (
        capture_method in ('manual','automatic')
      );
  end if;
end $$;

-- Backfill status_v2 from existing status
update orders
set status_v2 = case
  when status = 'delivered' then 'delivered'
  when status = 'failed' then 'voided'
  when status = 'paid' then 'captured'
  when status = 'processing' then 'captured'
  else 'authorized'
end
where status_v2 is null
   or (status_v2 = 'authorized' and status is not null and status != 'pending');

-- ============================================================ ORDER ITEMS

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'order_items' and column_name = 'slot_date'
  ) then
    alter table order_items add column slot_date date;
  end if;
end $$;

-- ============================================================ INDEXES

create index if not exists orders_status_v2_idx on orders(status_v2);
create index if not exists orders_capture_deadline_idx on orders(capture_deadline_at)
  where status_v2 = 'authorized';
create index if not exists order_items_slot_date_idx on order_items(slot_date);

-- ============================================================ DONE

-- Verify by running:
--   select column_name from information_schema.columns
--   where table_name = 'orders' and column_name in
--     ('status_v2','confirmed_delivery_at','capture_deadline_at','capture_method');
