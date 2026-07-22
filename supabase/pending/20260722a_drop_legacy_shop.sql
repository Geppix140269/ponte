-- Phase 0: drop the report shop's tables.
--
-- The shop's code was removed in 97fdb6b ("Eliminate the legacy shop") and its
-- last debris in this cleanup. Its tables were left behind, and supabase/
-- schema.sql still described them as the current schema, so the only written
-- record of what Ponte stores was a description of a business that no longer
-- exists.
--
-- What is being dropped, with row counts read from the live database on
-- 2026-07-22 before this file was written:
--
--   products                   54 rows   catalogue of report SKUs
--   categories                 10 rows   their categories
--   bundle_items               33 rows   which SKUs made up which bundle
--   orders                      0 rows   never used
--   order_items                 0 rows   never used
--   order_notes                 0 rows   never used
--   newsletter_subscribers      0 rows   never used, its form component is gone
--   listings_legacy_20260720    0 rows   archived by 20260720_marketplace_listings
--
-- The shop took zero orders in its lifetime. The 97 rows that do exist are
-- product copy for reports that were never sold and cannot be, because there
-- is no checkout, no fulfilment and no PDF pipeline left to serve them.
--
-- NOT APPLIED, AND DELIBERATELY SO. Decision of 2026-07-22: this waits until
-- after the August 1 launch. Dropping eight tables buys nothing before launch,
-- because nothing reads them, and an irreversible schema change in the ten days
-- before a launch is a risk taken for no return.
--
-- It lives in supabase/pending/ rather than supabase/migrations/ for a reason
-- that was not known when it was written: the Supabase GitHub integration
-- applies everything in migrations/ to the PRODUCTION database on every merge
-- to main. This file sorts last by filename, so in that folder it would have
-- been the final statement run against production the moment the branch
-- merged, in direct contradiction of the decision to defer it. See
-- supabase/pending/README.md.
--
-- WHEN IT IS RUN, POST-LAUNCH: take a FRESH backup first, do not rely on the
-- 2026-07-22_1204 one referenced below. `npm run backup` writes every table and
-- bucket to C:\Users\gfuna\ponte-backups, and as of commit 11171e9 it finally
-- covers all twenty-four tables rather than fifteen.
--
-- Run in the Supabase SQL Editor. Safe to re-run.

-- Order matters even with `if exists`, because these carry foreign keys to
-- each other. Children first, then parents.
drop table if exists bundle_items;
drop table if exists order_notes;
drop table if exists order_items;
drop table if exists orders;
drop table if exists products;
drop table if exists categories;
drop table if exists newsletter_subscribers;

-- Archived by the marketplace migration in July, never read since, empty.
drop table if exists listings_legacy_20260720;

-- The empty storage bucket the shop delivered from. Its policies go with it.
--
-- ponte-previews is deliberately NOT dropped here: it still holds a 36 MB
-- sample PDF, and deleting a file somebody may still be linking to is a
-- separate decision from dropping empty tables.
drop policy if exists "Public read ponte-reports"   on storage.objects;
drop policy if exists "Admin insert ponte-reports"  on storage.objects;
drop policy if exists "Admin update ponte-reports"  on storage.objects;
drop policy if exists "Admin delete ponte-reports"  on storage.objects;
delete from storage.buckets where id = 'ponte-reports';

-- profiles.stripe_customer_id stays. The shop created it, but a Stripe
-- customer id is exactly what the credit pack purchase will need, and
-- dropping a column to re-add it in a fortnight is churn, not cleanup.
