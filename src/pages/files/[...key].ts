import type { APIRoute } from 'astro';
import { getBucket } from '../../lib/media';
import { EPAPER_KEY_RE } from '../../lib/epaper';

// E-paper PDFs and their cover images, straight from R2.
export const GET: APIRoute = async ({ params, locals }) => {
  const key = params.key ?? '';
  if (!EPAPER_KEY_RE.test(key)) return new Response('Not found', { status: 404 });
  const obj = await getBucket(locals).get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, { headers: {
    'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable', // unique file names
    'X-Content-Type-Options': 'nosniff', ETag: obj.httpEtag } });
};
