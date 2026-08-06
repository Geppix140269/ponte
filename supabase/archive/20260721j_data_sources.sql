-- Third party datasource registry and fallback cache.
--
-- Additive only. Nothing here alters an existing table.

create table if not exists data_sources (
  id                 text primary key,
  category           text not null,
  provider           text not null,
  auth_class         text not null check (auth_class in ('none', 'register', 'freemium')),
  endpoint           text not null,
  enabled            boolean not null default true,
  -- Whether the licence permits redistributing the data, not merely reading
  -- it. False means the source may inform a Ponte answer but must not be
  -- republished verbatim. This is a legal flag, so it is stored rather than
  -- left in a comment somewhere in the code.
  commercial_ok      boolean not null default true,
  note               text,
  last_health_at     timestamptz,
  last_health_status text,
  updated_at         timestamptz not null default now()
);

create table if not exists data_source_cache (
  id         uuid primary key default gen_random_uuid(),
  -- Deliberately NOT a foreign key to data_sources.
  --
  -- Some cache entries belong to an aggregate rather than to one upstream:
  -- the FX median is computed from up to three providers and is stored under
  -- 'fx.median', which is not itself a source anyone can call. A foreign key
  -- would force a fake registry row for every aggregate, and the registry is
  -- meant to be the list of things that can actually be called and health
  -- checked. The cost is that a typo in a source id makes an orphan row
  -- instead of an error, which a cache can absorb.
  source_id  text not null,
  cache_key  text not null,
  payload    jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (source_id, cache_key)
);

-- Staleness is judged per read, but a sweep of very old rows will want this.
create index if not exists data_source_cache_fetched_at_idx
  on data_source_cache (fetched_at);

-- Both tables are server side only. Every datasource call runs in a route
-- handler or a scheduled job holding the service role key, which bypasses
-- RLS. Enabling RLS with no policy therefore denies the anon and authenticated
-- roles entirely, which is the intent: a member has no reason to read the
-- cache directly, and the registry names our upstreams and their auth class.
alter table data_sources      enable row level security;
alter table data_source_cache enable row level security;
