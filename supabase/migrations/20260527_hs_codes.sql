-- HS Code Search — Migration
-- Run in Supabase SQL Editor after enabling the vector extension.

CREATE EXTENSION IF NOT EXISTS vector;

-- ── Master codes table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hs_codes (
  id              BIGSERIAL PRIMARY KEY,
  code            TEXT NOT NULL,
  code_clean      TEXT NOT NULL,
  schedule        TEXT NOT NULL,
  level           SMALLINT NOT NULL,
  chapter         TEXT NOT NULL,
  chapter_desc    TEXT,
  heading         TEXT NOT NULL,
  heading_desc    TEXT,
  subheading      TEXT,
  subheading_desc TEXT,
  description     TEXT NOT NULL,
  parent_code     TEXT,
  notes           TEXT,
  unit            TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  hs_version      TEXT DEFAULT '2022',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS hs_codes_code_schedule_idx
  ON public.hs_codes (code_clean, schedule);
CREATE INDEX IF NOT EXISTS hs_codes_schedule_idx ON public.hs_codes (schedule);
CREATE INDEX IF NOT EXISTS hs_codes_chapter_idx  ON public.hs_codes (chapter, schedule);
CREATE INDEX IF NOT EXISTS hs_codes_fts_idx
  ON public.hs_codes USING GIN (to_tsvector('english', description));

-- ── Embeddings (pgvector) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hs_embeddings (
  id          BIGSERIAL PRIMARY KEY,
  hs_code_id  BIGINT NOT NULL REFERENCES public.hs_codes(id) ON DELETE CASCADE,
  embedding   vector(1536) NOT NULL,
  model       TEXT DEFAULT 'text-embedding-3-small',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS hs_embeddings_code_idx
  ON public.hs_embeddings (hs_code_id);

-- ── User saved codes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hs_saved_codes (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hs_code_id  BIGINT NOT NULL REFERENCES public.hs_codes(id) ON DELETE CASCADE,
  label       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS hs_saved_codes_user_code_idx
  ON public.hs_saved_codes (user_id, hs_code_id);
CREATE INDEX IF NOT EXISTS hs_saved_codes_user_idx
  ON public.hs_saved_codes (user_id);

-- ── Search history ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hs_search_history (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query         TEXT NOT NULL,
  schedule      TEXT,
  result_code   TEXT,
  used_gpt      BOOLEAN DEFAULT FALSE,
  confidence    NUMERIC(4,3),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hs_search_history_user_idx
  ON public.hs_search_history (user_id, created_at DESC);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.hs_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read hs_codes"
  ON public.hs_codes FOR SELECT TO authenticated USING (true);

ALTER TABLE public.hs_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read hs_embeddings"
  ON public.hs_embeddings FOR SELECT TO authenticated USING (true);

ALTER TABLE public.hs_saved_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved codes"
  ON public.hs_saved_codes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.hs_search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own search history"
  ON public.hs_search_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Vector search function ────────────────────────────────────
CREATE OR REPLACE FUNCTION match_hs_codes(
  query_embedding vector(1536),
  schedule_filter TEXT DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.5,
  match_count     INT DEFAULT 10
)
RETURNS TABLE (
  id              BIGINT,
  code            TEXT,
  schedule        TEXT,
  level           SMALLINT,
  chapter         TEXT,
  chapter_desc    TEXT,
  heading         TEXT,
  heading_desc    TEXT,
  description     TEXT,
  unit            TEXT,
  similarity      FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    hc.id, hc.code, hc.schedule, hc.level,
    hc.chapter, hc.chapter_desc, hc.heading, hc.heading_desc,
    hc.description, hc.unit,
    1 - (he.embedding <=> query_embedding) AS similarity
  FROM public.hs_embeddings he
  JOIN public.hs_codes hc ON he.hs_code_id = hc.id
  WHERE
    hc.is_active = TRUE
    AND (schedule_filter IS NULL OR hc.schedule = schedule_filter)
    AND 1 - (he.embedding <=> query_embedding) > match_threshold
  ORDER BY he.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ── Auto-update timestamp ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_hs_codes_updated_at ON public.hs_codes;
CREATE TRIGGER update_hs_codes_updated_at
  BEFORE UPDATE ON public.hs_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
