-- Fuzzy name matching for sanctions screening.
--
-- Additive. Safe to re-run. Depends on 20260721g_verification.sql for
-- sanctions_entries and on the pg_trgm extension it enables.
--
-- Why a function rather than a query from the application: the alias score
-- needs a lateral unnest over normalized_aliases, and the candidate set has to
-- be cut down by the trigram indexes before any scoring happens. Both of those
-- belong in the database, next to the indexes, not in a round trip.

create extension if not exists pg_trgm;

drop function if exists sanctions_match(text, real, int, text);
drop function if exists sanctions_match(text, real, int, text, timestamptz);

create function sanctions_match(
  p_name text,
  p_threshold real default 0.4,
  p_limit int default 50,
  p_entity_type text default null,
  -- Only entries imported at or after this moment. Null means the whole list.
  -- This is what scopes the daily re-screen to the lists the last refresh
  -- rebuilt, instead of re-screening every subject against everything.
  p_since timestamptz default null
)
returns table (
  id uuid,
  source_list text,
  entry_id text,
  primary_name text,
  normalized_name text,
  aliases text[],
  entity_type text,
  country text,
  programs text[],
  listed_date date,
  score real,
  matched_on text
)
language sql
stable
security definer
-- The % prefilter uses pg_trgm.similarity_threshold, whose default is 0.3.
-- That default is deliberately looser than the 0.4 candidate threshold: the
-- index narrows, and the explicit score in the WHERE below is what decides.
--
-- The threshold is NOT pinned here. Supabase refuses a function level SET on
-- that parameter (it needs superuser), and pinning it is unnecessary because
-- nothing decides on it: a caller with a looser session threshold gets more
-- rows into the prefilter, and the score comparison still rejects them.
set search_path = public
as $$
  with scored as (
    select
      e.id,
      e.source_list,
      e.entry_id,
      e.primary_name,
      e.normalized_name,
      e.aliases,
      e.entity_type,
      e.country,
      e.programs,
      e.listed_date,
      similarity(e.normalized_name, p_name) as name_score,
      -- The best single alias, not the aliases mashed together: joining them
      -- into one string dilutes the trigram score of every one of them.
      coalesce((
        select max(similarity(al.alias_name, p_name))
        from unnest(e.normalized_aliases) as al(alias_name)
        where al.alias_name <> ''
      ), 0::real) as alias_score
    from sanctions_entries e
    where (
      -- Both arms are index backed: sanctions_name_trgm on normalized_name and
      -- sanctions_alias_trgm on the joined alias string.
      e.normalized_name % p_name
      or array_to_string(e.normalized_aliases, ' ') % p_name
    )
    -- An entity type filter never removes a row whose type is unknown. A list
    -- that does not say what something is must not be allowed to hide it.
    and (
      p_entity_type is null
      or e.entity_type is null
      or e.entity_type = p_entity_type
    )
    and (p_since is null or e.imported_at >= p_since)
  )
  select
    s.id,
    s.source_list,
    s.entry_id,
    s.primary_name,
    s.normalized_name,
    s.aliases,
    s.entity_type,
    s.country,
    s.programs,
    s.listed_date,
    greatest(s.name_score, s.alias_score)::real as score,
    case when s.alias_score > s.name_score then 'alias' else 'name' end as matched_on
  from scored s
  where greatest(s.name_score, s.alias_score) >= p_threshold
  order by greatest(s.name_score, s.alias_score) desc, s.source_list, s.entry_id
  limit greatest(p_limit, 1);
$$;

comment on function sanctions_match(text, real, int, text, timestamptz) is
  'Trigram match of a normalized subject name against sanctions_entries. Returns candidates at or above p_threshold, scored on the better of the primary name and the best alias. Screening decisions live in the application: this only proposes candidates.';

-- Screening runs server side with the service role. Nothing in the browser
-- needs this, so nothing in the browser gets it.
revoke all on function sanctions_match(text, real, int, text, timestamptz) from public;
grant execute on function sanctions_match(text, real, int, text, timestamptz) to service_role;
