import type { APIRoute } from 'astro';
import { getBucket, KEY_RE } from '../../lib/media';

export const GET: APIRoute = async ({ params, locals }) => {
  const key = params.key ?? '';
  if (!KEY_RE.test(key)) return new Response('Not found', { status: 404 });
  const obj = await getBucket(locals).get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, { headers: {
    'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable', // file names are unique, so safe to cache for a year
    'X-Content-Type-Options': 'nosniff', ETag: obj.httpEtag } });
};
