-- Searchable help knowledge for AI-assisted answers (RAG).
-- Sync content: npm run qa:sync-help-knowledge

CREATE TABLE IF NOT EXISTS documentation_help_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chunk_key VARCHAR(160) NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'help',
  section_id VARCHAR(64),
  item_id VARCHAR(64),
  section_title TEXT,
  item_title TEXT NOT NULL,
  content TEXT NOT NULL,
  audience TEXT[] NOT NULL DEFAULT ARRAY['all'],
  content_hash VARCHAR(64) NOT NULL,
  embedding JSONB,
  search_vector tsvector,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT documentation_help_chunks_key_nonempty CHECK (length(trim(chunk_key)) > 0),
  CONSTRAINT documentation_help_chunks_title_nonempty CHECK (length(trim(item_title)) > 0),
  CONSTRAINT documentation_help_chunks_content_nonempty CHECK (length(trim(content)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_documentation_help_chunks_key
  ON documentation_help_chunks (chunk_key);

CREATE INDEX IF NOT EXISTS idx_documentation_help_chunks_active
  ON documentation_help_chunks (is_active, sort_order)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_documentation_help_chunks_search
  ON documentation_help_chunks USING GIN (search_vector);

COMMENT ON TABLE documentation_help_chunks IS 'Chunked help/developer/FAQ text for hybrid FTS + embedding retrieval (RAG).';
