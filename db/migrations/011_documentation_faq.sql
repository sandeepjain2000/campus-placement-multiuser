-- Screen-scoped user documentation FAQs (keyword search; no LLM).
-- screen_tag: DevScreenTag id (e.g. S-1, S-2) from app routing, or GLOBAL for all screens.

CREATE TABLE IF NOT EXISTS documentation_faq (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_tag VARCHAR(32) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT documentation_faq_screen_tag_nonempty CHECK (length(trim(screen_tag)) > 0),
  CONSTRAINT documentation_faq_question_nonempty CHECK (length(trim(question)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_documentation_faq_screen_active
  ON documentation_faq (screen_tag, sort_order)
  WHERE is_active = true;

COMMENT ON TABLE documentation_faq IS 'In-app help FAQs; search screen_tag first, then GLOBAL, then any match.';

-- Example (optional):
-- INSERT INTO documentation_faq (screen_tag, question, answer, sort_order) VALUES
-- ('GLOBAL', 'What is PlacementHub?', 'Campus placement and employer engagement for your college.', 0),
-- ('S-1', 'How do I reset my password?', 'Use Forgot password on the login page or ask your TPO.', 0);
