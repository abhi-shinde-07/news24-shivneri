-- Articles can carry a YouTube video (shown as the lead media), plus a crime/accident section.
ALTER TABLE articles ADD COLUMN youtube_id TEXT;
INSERT INTO categories (slug, name_mr, sort_order) VALUES ('crime', 'गुन्हे / अपघात', 2)
  ON CONFLICT(slug) DO NOTHING;
