import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { json, nowIso, parseArticle } from '../../../../lib/articles';

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'चुकीचा डेटा.' }, 400); }
  const p = parseArticle(body);
  if ('error' in p) return json(p, 400);
  const d = p.data;
  if (!(await db.prepare('SELECT id FROM categories WHERE id = ? AND is_active = 1').bind(d.category_id).first()))
    return json({ error: 'विभाग निवडा.' }, 400);
  const now = nowIso();
  const slug = 'a-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const r = await db.prepare(
    `INSERT INTO articles (slug, headline, subtitle, body_html, category_id, location_label, byline, author_id, source,
       image_credit, main_image_key, main_image_caption, is_featured, is_breaking, status, published_at, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`)
    .bind(slug, d.headline, d.subtitle, d.body_html, d.category_id, d.location_label, d.byline, locals.user!.id, d.source,
      d.image_credit, d.main_image_key, d.main_image_caption, d.is_featured, d.is_breaking, d.status, d.status === 'published' ? now : null, now, now)
    .first<{ id: number }>();
  return json({ id: r!.id });
};
