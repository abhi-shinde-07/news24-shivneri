import type { APIRoute } from 'astro';
import { getDB, getLatest } from '../lib/db';
import { edgeCached } from '../lib/cache';
import { esc, SITE } from '../lib/page';

export const GET: APIRoute = ({ locals }) =>
  edgeCached(locals, 'rss-v1', 600, async () => {
    const { articles } = await getLatest(getDB(locals), 1, 30);
    const items = articles.map((a) => `<item><title>${esc(a.headline)}</title><link>${SITE}/news/${a.id}</link>
<guid>${SITE}/news/${a.id}</guid><pubDate>${new Date(a.published_at).toUTCString()}</pubDate><category>${esc(a.category_name)}</category>
${a.subtitle ? `<description>${esc(a.subtitle)}</description>` : ''}</item>`).join('\n');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>NEWS24 SHIVNERI</title><link>${SITE}/</link>
<description>निर्भिड सत्याचा बुलंद आवाज</description><language>mr</language>
${items}
</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
  });
