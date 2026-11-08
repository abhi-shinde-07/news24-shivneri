-- NEWS24 SHIVNERI – initial schema (Cloudflare D1 / SQLite)
-- Dates are ISO-8601 UTC text. Images/PDFs live in R2; only their keys are stored here.

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','editor')),
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL UNIQUE,
  name_mr    TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE articles (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  slug               TEXT NOT NULL UNIQUE,
  headline           TEXT NOT NULL,
  subtitle           TEXT,
  body_html          TEXT NOT NULL DEFAULT '',
  category_id        INTEGER NOT NULL REFERENCES categories(id),
  location_label     TEXT,
  byline             TEXT NOT NULL,
  author_id          INTEGER REFERENCES users(id),
  source             TEXT NOT NULL,
  image_credit       TEXT,
  main_image_key     TEXT,
  main_image_caption TEXT,
  is_featured        INTEGER NOT NULL DEFAULT 0,
  is_breaking        INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at       TEXT,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  CHECK (status <> 'published' OR published_at IS NOT NULL)
);
CREATE INDEX idx_articles_status_pub ON articles(status, published_at DESC);
CREATE INDEX idx_articles_cat_pub    ON articles(category_id, status, published_at DESC);

CREATE TABLE article_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  image_key  TEXT NOT NULL,
  caption    TEXT,
  credit     TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE corrections (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  note       TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX idx_corrections_article ON corrections(article_id);

CREATE TABLE article_revisions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  headline   TEXT NOT NULL,
  body_html  TEXT NOT NULL,
  saved_by   INTEGER REFERENCES users(id),
  saved_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE ads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  advertiser  TEXT NOT NULL,
  image_key   TEXT NOT NULL,
  click_url   TEXT,
  position    TEXT NOT NULL CHECK (position IN ('top','main_headline','sidebar','in_between','bottom')),
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX idx_ads_lookup ON ads(position, status, start_date, end_date);

CREATE TABLE videos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_id   TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  description  TEXT,
  is_featured  INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
  published_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE epapers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_date TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  pdf_key      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TEXT
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO categories (slug, name_mr, sort_order) VALUES
  ('politics','राजकारण',1), ('social','सामाजिक',2), ('education','शिक्षण',3),
  ('agriculture','शेती',4), ('business','व्यवसाय',5), ('sports','क्रीडा',6),
  ('entertainment','मनोरंजन',7);

INSERT INTO settings (key, value) VALUES
  ('site_name','NEWS24 SHIVNERI'),
  ('tagline_sub','मराठी डिजिटल वृत्तपत्र'),
  ('tagline','आजचे सत्य • उद्याची दिशा'),
  ('edition','स्थानिक आवृत्ती');
