-- Desk Radar: the table.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260722f_desk_radar.sql
--
-- Market opportunities the desk identified in the open market. NOT member
-- listings and never presented as such. Spec:
-- Ponte_Desk_Radar_Spec_2026-07-22.md.
--
-- ---------------------------------------------------------------------------
-- The public/internal split is the whole point of this schema
-- ---------------------------------------------------------------------------
-- Section 2 of the spec is a set of promises about what a radar card may and
-- may not say. Two of them are enforced here rather than left to the UI:
--
--   - the counterparty's identity and contacts, the source platform and the
--     source URL are stored, because the desk needs them to pursue anything,
--     and are unreadable by any client. RLS grants select on this table to
--     nobody: every public read goes through the service role in
--     lib/board/live-deals.ts, which selects the public columns by name.
--   - `raw_description` holds the source's own prose. It exists so the desk
--     can see what was actually posted, and it must never render publicly.
--     `ai_description` is the paraphrase written in our words, and that is the
--     only description a card may ever show.
--
-- A UI bug should not be able to leak a counterparty. Ask for the columns you
-- mean.

create table if not exists desk_radar (
  id uuid primary key default gen_random_uuid(),

  -- ===== Public =====
  side text not null check (side in ('offer', 'requirement')),
  product text not null,
  hs_code text,
  qty numeric,
  unit text,
  incoterms text,
  payment text,
  origin text,
  destination text,
  category text,
  spotted_at timestamptz not null default now(),
  -- Shorter than a member listing's on purpose: an opportunity seen in the
  -- open market goes stale fast, and is only refreshed if the desk re-confirms
  -- it is still live.
  valid_until timestamptz,
  status text not null default 'live'
    check (status in ('live', 'under_pursuit', 'graduated', 'expired', 'removed')),
  ai_description text,
  summary_line text,

  -- ===== Internal, desk only =====
  source_platform text,
  source_url text,
  raw_description text,
  counterparty_name text,
  counterparty_company text,
  counterparty_contact text,
  notes text,

  -- Dedupe key: product + quantity + route, per spec section 5.
  dedupe_key text unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists desk_radar_live_idx
  on desk_radar (status, spotted_at desc);
create index if not exists desk_radar_category_idx on desk_radar (category);

-- RLS on, and deliberately no policy. Nothing reaches a browser directly.
-- The homepage and the board read through the service role, naming the public
-- columns, so the internal block cannot travel even if a query is careless.
alter table desk_radar enable row level security;
