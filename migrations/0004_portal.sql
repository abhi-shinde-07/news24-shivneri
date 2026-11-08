-- Phases B-I: gallery flag, e-paper details, 2-step login, default settings.
ALTER TABLE media ADD COLUMN in_gallery INTEGER NOT NULL DEFAULT 0;
ALTER TABLE media ADD COLUMN caption TEXT;
CREATE INDEX idx_media_gallery ON media(in_gallery, id DESC);

ALTER TABLE epapers ADD COLUMN edition_name TEXT NOT NULL DEFAULT 'स्थानिक आवृत्ती';
ALTER TABLE epapers ADD COLUMN size INTEGER NOT NULL DEFAULT 0;
ALTER TABLE epapers ADD COLUMN cover_key TEXT;

ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_videos_pub ON videos(status, published_at DESC);
CREATE INDEX idx_revisions_article ON article_revisions(article_id, saved_at DESC);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('motto','निर्भिड सत्याचा बुलंद आवाज'),
  ('editor_name','[संपादकाचे नाव]'),
  ('contact_email','[ईमेल पत्ता]'),
  ('phone','[फोन नंबर]'),
  ('address','[कार्यालयाचा पत्ता], पुणे जिल्हा, महाराष्ट्र'),
  ('grievance_name','[तक्रार निवारण अधिकाऱ्याचे नाव]'),
  ('grievance_address','[तक्रार निवारण अधिकाऱ्याचा पत्ता]'),
  ('footer_text','© NEWS24 SHIVNERI. सर्व हक्क राखीव.'),
  ('social_facebook',''), ('social_instagram',''), ('social_youtube',''), ('social_x',''), ('social_whatsapp',''),
  ('seo_description','NEWS24 SHIVNERI – पुणे जिल्ह्यातील विश्वासार्ह मराठी डिजिटल वृत्तपत्र. निर्भिड सत्याचा बुलंद आवाज.'),
  ('seo_og_image','/og-image.png'),
  ('google_verification',''),
  ('epaper_retention_months','12');
