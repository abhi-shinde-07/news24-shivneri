import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { json } from '../../../../lib/articles';
import { getBucket } from '../../../../lib/media';

// Gallery flag and caption for the public /photos page.
export const PATCH: APIRoute = async ({ locals, params, request }) => {
  const b = (await request.json().catch(() => ({}))) as { in_gallery?: unknown; caption?: unknown };
  const caption = String(b.caption ?? '').trim().slice(0, 300) || null;
  const r = await getDB(locals).prepare('UPDATE media SET in_gallery = ?, caption = ? WHERE id = ? RETURNING id')
    .bind(b.in_gallery ? 1 : 0, caption, Number(params.id)).first();
  return r ? json({ ok: true }) : json({ error: 'सापडले नाही.' }, 404);
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  const db = getDB(locals);
  const m = await db.prepare('SELECT id, key FROM media WHERE id = ?').bind(Number(params.id)).first<{ id: number; key: string }>();
  if (!m) return json({ error: 'सापडले नाही.' }, 404);
  const used = await db.prepare('SELECT COUNT(*) AS n FROM articles WHERE main_image_key = ? OR body_html LIKE ?')
    .bind(m.key, `%/media/${m.key}%`).first<{ n: number }>();
  if ((used?.n ?? 0) > 0) return json({ error: 'ही प्रतिमा बातम्यांमध्ये वापरलेली आहे, म्हणून हटवता येणार नाही.' }, 409);
  if (await db.prepare('SELECT id FROM ads WHERE image_key = ?').bind(m.key).first())
    return json({ error: 'ही प्रतिमा जाहिरातीत वापरलेली आहे, म्हणून हटवता येणार नाही.' }, 409);
  await getBucket(locals).delete(m.key);
  await db.prepare('DELETE FROM media WHERE id = ?').bind(m.id).first();
  return json({ ok: true });
};
