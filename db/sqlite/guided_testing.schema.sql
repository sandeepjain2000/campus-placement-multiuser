-- Local laptop guided testing (SQLite). File: db/sqlite/guided_testing.sqlite
-- Not used in production Postgres — dev / sandbox only.

CREATE TABLE IF NOT EXISTS guided_session (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active INTEGER NOT NULL DEFAULT 0,
  playbook_id TEXT,
  marker TEXT,
  started_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO guided_session (id, active) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS guided_step_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  step_index INTEGER,
  step_total INTEGER,
  step_label TEXT,
  phase TEXT,
  observe TEXT,
  wait_gen INTEGER NOT NULL DEFAULT 0,
  armed INTEGER NOT NULL DEFAULT 0,
  running INTEGER NOT NULL DEFAULT 0,
  click_ack INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO guided_step_state (id) VALUES (1);

CREATE TABLE IF NOT EXISTS guided_step_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  marker TEXT,
  playbook_id TEXT,
  step_index INTEGER,
  step_total INTEGER,
  event TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_guided_step_log_created ON guided_step_log (created_at DESC);

CREATE TABLE IF NOT EXISTS guided_prefs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
