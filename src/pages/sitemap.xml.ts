import type { APIRoute } from 'astro';
import { getDB } from '../lib/db';
import { edgeCached } from '../lib/cache';
import { esc, SITE } from '../lib/page';

const LIVE = `status = 'published' AND published_at <= strftime('%Y-%m-%dT%H:%M:%SZ','now')`;

export const GET: APIRoute = ({ locals }) =>
  edgeCached(locals, 'sitemap-v1', 600, async () => {
    const db = getDB(locals);
    const articles = (await db.prepare(`SELECT id, updated_at FROM articles WHERE ${LIVE} ORDER BY published_at DESC LIMIT 45000`)
      .all<{ id: number; updated_at: string }>()).results;
    const cats = (await db.prepare(
      `SELECT c.slug, MAX(a.updated_at) AS lastmod FROM categories c LEFT JOIN articles a ON a.category_id = c.id AND a.${LIVE.replace(/ AND /, ' AND a.')}
       WHERE c.is_active = 1 GROUP BY c.id ORDER BY c.sort_order`).all<{ slug: string; lastmod: string | null }>()).results;
    const videos = (await db.prepare(`SELECT id, published_at FROM videos WHERE status = 'published' ORDER BY published_at DESC LIMIT 2000`)
      .all<{ id: number; published_at: string }>()).results;
    const newest = articles[0]?.updated_at;
    const url = (loc: string, lastmod?: string | null) =>
      `<url><loc>${esc(SITE + loc)}</loc>${lastmod ? `<lastmod>${esc(lastmod)}</lastmod>` : ''}</url>`;
    const body = [
      url('/', newest), url('/latest', newest),
      ...cats.map((c) => url(`/category/${c.slug}`, c.lastmod)),
      ...['/about', '/contact', '/editorial-policy', '/corrections', '/videos', '/photos', '/epaper'].map((p) => url(p)),
      ...articles.map((a) => url(`/news/${a.id}`, a.updated_at)),
      ...videos.map((v) => url(`/videos/${v.id}`, v.published_at)),
    ].join('\n');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`,
      { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  });
