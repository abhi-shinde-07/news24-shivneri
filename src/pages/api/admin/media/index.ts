import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { json } from '../../../../lib/articles';
import { getBucket, MAX_UPLOAD, newKey, sniffImage } from '../../../../lib/media';

export const GET: APIRoute = async ({ locals, url }) => {
  const db = getDB(locals);
  const before = Number(url.searchParams.get('before')) || 1e12;
  const items = (await db.prepare('SELECT id, key, filename, size FROM media WHERE id < ? ORDER BY id DESC LIMIT 60').bind(before)
    .all<{ id: number; key: string; filename: string | null; size: number }>()).results;
  const t = await db.prepare('SELECT COALESCE(SUM(size),0) AS bytes, COUNT(*) AS n FROM media').first<{ bytes: number; n: number }>();
  return json({ items, total_bytes: t?.bytes ?? 0, count: t?.n ?? 0 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return json({ error: 'फाईल निवडा.' }, 400);
  if (file.size > MAX_UPLOAD) return json({ error: 'फाईल खूप मोठी आहे (कमाल २.५ MB).' }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return json({ error: 'फक्त JPG, PNG किंवा WebP चालेल.' }, 400);
  const key = newKey(kind.ext);
  await getBucket(locals).put(key, bytes, { httpMetadata: { contentType: kind.mime } });
  const r = await getDB(locals).prepare(
    'INSERT INTO media (key, filename, content_type, size, uploaded_by) VALUES (?,?,?,?,?) RETURNING id')
    .bind(key, file.name.slice(0, 200), kind.mime, bytes.length, locals.user!.id).first<{ id: number }>();
  return json({ id: r!.id, key });
};
