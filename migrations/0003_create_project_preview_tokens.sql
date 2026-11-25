CREATE TABLE IF NOT EXISTS project_preview_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id, project_id) REFERENCES projects(user_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS project_preview_tokens_project_idx
  ON project_preview_tokens (user_id, project_id, expires_at);
