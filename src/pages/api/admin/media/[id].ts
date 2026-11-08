import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { json } from '../../../../lib/articles';
import { getBucket } from '../../../../lib/media';

export const DELETE: APIRoute = async ({ locals, params }) => {
  const db = getDB(locals);
  const m = await db.prepare('SELECT id, key FROM media WHERE id = ?').bind(Number(params.id)).first<{ id: number; key: string }>();
  if (!m) return json({ error: 'सापडले नाही.' }, 404);
  const used = await db.prepare('SELECT COUNT(*) AS n FROM articles WHERE main_image_key = ? OR body_html LIKE ?')
    .bind(m.key, `%/media/${m.key}%`).first<{ n: number }>();
  if ((used?.n ?? 0) > 0) return json({ error: 'ही प्रतिमा बातम्यांमध्ये वापरलेली आहे, म्हणून हटवता येणार नाही.' }, 409);
  await getBucket(locals).delete(m.key);
  await db.prepare('DELETE FROM media WHERE id = ?').bind(m.id).first();
  return json({ ok: true });
};
