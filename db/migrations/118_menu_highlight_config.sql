-- Migration 118: Super Admin configurable menu item highlighting
-- Single-row config: global color, per-role item keys, selected entities.

CREATE TABLE IF NOT EXISTS menu_highlight_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  highlight_color TEXT NOT NULL DEFAULT '#FF0000',
  selected_items JSONB NOT NULL DEFAULT '{}'::jsonb,
  selected_entities JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO menu_highlight_config (id, highlight_color, selected_items, selected_entities)
VALUES (1, '#FF0000', '{}'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;
