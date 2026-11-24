CREATE TABLE IF NOT EXISTS projects (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  updated_at TEXT NOT NULL,
  messages TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(messages) AND json_type(messages) = 'array'),
  html TEXT,
  files TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(files) AND json_type(files) = 'array'),
  is_new_project INTEGER NOT NULL DEFAULT 0 CHECK (is_new_project IN (0, 1)),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS projects_user_updated_at_idx
  ON projects (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS project_migrations (
  user_id TEXT PRIMARY KEY,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
