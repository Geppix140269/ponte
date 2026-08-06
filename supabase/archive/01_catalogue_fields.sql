-- Migration 01: Add catalogue fields missing from the initial schema.
-- Run this in the Supabase SQL Editor BEFORE running the seed script.

alter table products add column if not exists band text;
alter table products add column if not exists includes jsonb;
alter table products add column if not exists price_from boolean default false;
alter table products add column if not exists price_suffix text;
alter table products add column if not exists alt_price text;
alter table products add column if not exists price_tiers jsonb;
alter table products add column if not exists savings_cents int;
