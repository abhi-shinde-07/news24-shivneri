import type { APIRoute } from 'astro';
import { getDB } from '../lib/db';
import { edgeCached } from '../lib/cache';
import { esc, SITE } from '../lib/page';

// Google News sitemap: only articles from the last 48 hours.
export const GET: APIRoute = ({ locals }) =>
  edgeCached(locals, 'news-sitemap-v1', 600, async () => {
    const rows = (await getDB(locals).prepare(
      `SELECT id, headline, published_at FROM articles WHERE status = 'published'
       AND published_at <= strftime('%Y-%m-%dT%H:%M:%SZ','now') AND published_at >= strftime('%Y-%m-%dT%H:%M:%SZ','now','-48 hours')
       ORDER BY published_at DESC LIMIT 1000`).all<{ id: number; headline: string; published_at: string }>()).results;
    const body = rows.map((a) => `<url><loc>${SITE}/news/${a.id}</loc><news:news>
<news:publication><news:name>NEWS24 SHIVNERI</news:name><news:language>mr</news:language></news:publication>
<news:publication_date>${esc(a.published_at)}</news:publication_date><news:title>${esc(a.headline)}</news:title></news:news></url>`).join('\n');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${body}
</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  });
