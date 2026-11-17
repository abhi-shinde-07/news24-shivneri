-- More places for ads: inside news stories (top, middle of the text, end) and at the top of category pages.
-- SQLite cannot change a CHECK rule in place, so the table is rebuilt with the same data.
CREATE TABLE ads_new (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  advertiser  TEXT NOT NULL,
  image_key   TEXT NOT NULL,
  click_url   TEXT,
  position    TEXT NOT NULL CHECK (position IN ('top','main_headline','sidebar','in_between','bottom',
                'article_top','article_middle','article_bottom','category_top')),
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
INSERT INTO ads_new (id, advertiser, image_key, click_url, position, start_date, end_date, status, click_count, created_at)
  SELECT id, advertiser, image_key, click_url, position, start_date, end_date, status, click_count, created_at FROM ads;
DROP TABLE ads;
ALTER TABLE ads_new RENAME TO ads;
CREATE INDEX idx_ads_lookup ON ads(position, status, start_date, end_date);
