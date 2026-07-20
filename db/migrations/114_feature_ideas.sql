-- Feature Ideas board (college view) — public product ideas with votes.
-- College admins submit and upvote; statuses are managed by platform later.

BEGIN;

CREATE TABLE IF NOT EXISTS feature_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Pending approval'
    CHECK (status IN (
      'Pending approval',
      'Under consideration',
      'Planned',
      'In Development',
      'Shipped',
      'On Hold',
      'Not Planning'
    )),
  topics TEXT[] NOT NULL DEFAULT '{}',
  vote_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_ideas_status ON feature_ideas (status);
CREATE INDEX IF NOT EXISTS idx_feature_ideas_votes ON feature_ideas (vote_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_ideas_created ON feature_ideas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_ideas_topics ON feature_ideas USING GIN (topics);

CREATE TABLE IF NOT EXISTS feature_idea_votes (
  idea_id UUID NOT NULL REFERENCES feature_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (idea_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_idea_votes_user ON feature_idea_votes (user_id);

COMMENT ON TABLE feature_ideas IS 'Product feature ideas board (college role MVP).';
COMMENT ON TABLE feature_idea_votes IS 'One upvote per user per feature idea.';

COMMIT;
