-- The HS 2022 catalog: the single source of truth for product classification.
--
-- Additive. Creates one new table, one extension, one function. Nothing
-- existing is altered or dropped.
--
-- Run in the Supabase SQL Editor. Safe to re-run.
--
-- NOTE ON HOW THIS GETS APPLIED: the Supabase GitHub integration applies
-- supabase/migrations/ to production on push to main, but the chain aborts at
-- 02_ponte_previews_bucket.sql and has done since 2026-07-22, so nothing after
-- that file runs automatically. This one has to be applied by hand. See
-- supabase/pending/README.md for why the folder is in that state.
--
-- ---------------------------------------------------------------------------
-- Why a table and not a JSON file in the repo
-- ---------------------------------------------------------------------------
-- The full catalog is 5,613 rows. Slimmed to code plus a 90-character
-- description it is still 484 KB uncompressed, and the UI brief caps client
-- bundle growth at about 100 KB. So search is served from Postgres and the
-- browser is sent only what a member actually looked at.
--
-- ---------------------------------------------------------------------------
-- Why code is text
-- ---------------------------------------------------------------------------
-- 571 of the 5,613 codes begin with a zero: live animals, meat, dairy, fruit,
-- coffee. A numeric column silently turns 010121 into 10121 and every listing
-- in chapters 01 to 09 classifies wrong. The check constraint is what stops a
-- five digit code being written at all.

create extension if not exists pg_trgm;

create table if not exists hs_codes (
  -- Official WCO columns. Read-only at runtime: no code path may write these.
  code            text primary key check (code ~ '^\d{6}$'),
  display         text not null,          -- '0101.21'
  chapter         text not null,          -- '01'
  chapter_title   text not null,
  heading         text not null,          -- '0101'
  heading_title   text not null,
  description     text not null,          -- official WCO HS 2022 wording
  unit            text,                   -- WCO standard unit; null where none
  hs_edition      text not null default 'HS2022',

  -- Platform-owned decoration. These are the only writable columns, and only
  -- from the service role. HS 2028 enters force on 2028-01-01, which is why
  -- edition is a column rather than an assumption.
  short_title     text,
  examples        text[],

  source          text not null default 'official'
                    check (source in ('official', 'seed', 'ai_cached')),
  is_active       boolean not null default true,
  updated_at      timestamptz not null default now()
);

-- The composer opens on an icon tile grid of chapters, then drills to
-- headings, so both are looked up by prefix constantly.
create index if not exists hs_codes_chapter_idx on hs_codes (chapter) where is_active;
create index if not exists hs_codes_heading_idx on hs_codes (heading) where is_active;
create index if not exists hs_codes_edition_idx on hs_codes (hs_edition, is_active);

-- Search covers the official wording and the friendly decoration together: a
-- trader types "sugar", the official text says "Sugars; sucrose, chemically
-- pure", and only the trigram index bridges those two.
create index if not exists hs_codes_search_idx
  on hs_codes using gin (
    (coalesce(short_title, '') || ' ' || description || ' ' || heading_title) gin_trgm_ops
  );

alter table hs_codes enable row level security;

-- Public read. The catalog is published nomenclature, it is on the board in
-- front of logged out visitors, and it is the thing category pages are
-- indexed on.
drop policy if exists hs_codes_public_read on hs_codes;
create policy hs_codes_public_read on hs_codes
  for select using (is_active);

-- No insert, update or delete policy exists, for anyone. The catalog is
-- loaded and corrected by the service role, which bypasses RLS. That is the
-- rule the HS brief calls non-negotiable: the AI may select from this table
-- and decorate it, and may never invent a row in it.

-- ---------------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------------
-- Ranked by trigram similarity against the same expression the index covers,
-- with an exact code prefix always winning: a trader who types 1701 means the
-- heading, not something that merely reads like it.
create or replace function hs_search(q text, lim int default 20)
returns table (
  code          text,
  display       text,
  description   text,
  short_title   text,
  chapter       text,
  chapter_title text,
  heading       text,
  score         real
)
language sql
stable
as $$
  select
    h.code, h.display, h.description, h.short_title,
    h.chapter, h.chapter_title, h.heading,
    case
      when h.code like regexp_replace(q, '\D', '', 'g') || '%'
       and regexp_replace(q, '\D', '', 'g') <> '' then 1.0::real
      else similarity(
        coalesce(h.short_title, '') || ' ' || h.description || ' ' || h.heading_title,
        q
      )
    end as score
  from hs_codes h
  where h.is_active
    and (
      (regexp_replace(q, '\D', '', 'g') <> ''
        and h.code like regexp_replace(q, '\D', '', 'g') || '%')
      or coalesce(h.short_title, '') || ' ' || h.description || ' ' || h.heading_title % q
    )
  order by score desc, h.code
  limit least(coalesce(lim, 20), 50);
$$;

comment on table hs_codes is
  'Official HS 2022 nomenclature, 5,613 six-digit codes. Official columns are read-only; short_title and examples are platform decoration written by the service role only.';
