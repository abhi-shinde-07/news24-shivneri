import type { APIRoute } from 'astro';
import { SITE } from '../lib/page';

export const GET: APIRoute = () =>
  new Response(`User-agent: *
Disallow: /admin
Disallow: /api
Disallow: /go/

Sitemap: ${SITE}/sitemap.xml
Sitemap: ${SITE}/news-sitemap.xml
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600, s-maxage=600' } });
