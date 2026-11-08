-- Removes everything added by seed/demo-pune.sql. (R2 files stay; delete them from the Media Library / E-paper pages if needed.)
DELETE FROM corrections WHERE article_id IN (SELECT id FROM articles WHERE slug LIKE 'demo-pune-%');
DELETE FROM article_revisions WHERE article_id IN (SELECT id FROM articles WHERE slug LIKE 'demo-pune-%');
DELETE FROM articles WHERE slug LIKE 'demo-pune-%';
DELETE FROM ads WHERE image_key = 'img/2026/11/demoad.jpg';
DELETE FROM epapers WHERE pdf_key = 'epaper/2026/11/2026-11-08-demo.pdf';
DELETE FROM media WHERE key LIKE 'img/2026/11/demo%';
