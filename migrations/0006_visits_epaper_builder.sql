-- Visitor counter (starts at 1000) and e-paper pages built in the admin (layout JSON instead of a PDF).
CREATE TABLE IF NOT EXISTS counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT OR IGNORE INTO counters (name, value) VALUES ('visits', 1000);

ALTER TABLE epapers ADD COLUMN layout TEXT;
