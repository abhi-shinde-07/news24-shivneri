import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { json, nowIso, parseArticle } from '../../../../lib/articles';

export const PUT: APIRoute = async ({ request, locals, params }) => {
  const db = getDB(locals);
  const id = Number(params.id);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'चुकीचा डेटा.' }, 400); }
  const p = parseArticle(body);
  if ('error' in p) return json(p, 400);
  const d = p.data;
  const old = await db.prepare('SELECT headline, body_html, published_at FROM articles WHERE id = ?')
    .bind(id).first<{ headline: string; body_html: string; published_at: string | null }>();
  if (!old) return json({ error: 'बातमी सापडली नाही.' }, 404);
  if (!(await db.prepare('SELECT id FROM categories WHERE id = ? AND is_active = 1').bind(d.category_id).first()))
    return json({ error: 'विभाग निवडा.' }, 400);
  const now = nowIso();
  if (old.headline !== d.headline || old.body_html !== d.body_html) // keep edit history
    await db.prepare('INSERT INTO article_revisions (article_id, headline, body_html, saved_by) VALUES (?,?,?,?)')
      .bind(id, old.headline, old.body_html, locals.user!.id).first();
  const publishedAt = old.published_at ?? (d.status === 'published' ? now : null);
  await db.prepare(
    `UPDATE articles SET headline=?, subtitle=?, body_html=?, category_id=?, location_label=?, byline=?, source=?,
       image_credit=?, main_image_key=?, main_image_caption=?, is_featured=?, is_breaking=?, status=?, published_at=?, updated_at=? WHERE id=?`)
    .bind(d.headline, d.subtitle, d.body_html, d.category_id, d.location_label, d.byline, d.source,
      d.image_credit, d.main_image_key, d.main_image_caption, d.is_featured, d.is_breaking, d.status, publishedAt, now, id).first();
  return json({ id });
};
