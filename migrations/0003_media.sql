-- Media library: R2 holds the files, D1 holds the list (and sizes, for the storage meter).
CREATE TABLE media (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  key          TEXT NOT NULL UNIQUE,
  filename     TEXT,
  content_type TEXT NOT NULL,
  size         INTEGER NOT NULL,
  uploaded_by  INTEGER REFERENCES users(id),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
