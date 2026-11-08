import { sanitizeBody } from './sanitize';
import type { D1 } from './db';

// Permanent delete. Corrections, revisions and gallery rows go with it (ON DELETE CASCADE plus explicit deletes
// in case foreign keys are not enforced). Uploaded photos stay in the Media Library.
export async function deleteArticle(db: D1, id: number) {
  if (!Number.isInteger(id) || !(await db.prepare('SELECT id FROM articles WHERE id = ?').bind(id).first())) return false;
  for (const t of ['corrections', 'article_revisions', 'article_images'])
    await db.prepare(`DELETE FROM ${t} WHERE article_id = ?`).bind(id).first();
  await db.prepare('DELETE FROM articles WHERE id = ?').bind(id).first();
  return true;
}

export type ArticleInput = {
  headline: string; subtitle: string | null; body_html: string; category_id: number;
  location_label: string | null; byline: string; source: string; image_credit: string | null;
  main_image_key: string | null; main_image_caption: string | null; is_featured: 0 | 1; is_breaking: 0 | 1; status: 'draft' | 'published' | 'archived';
};
export const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');
export const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });

export function parseArticle(b: any): { error: string } | { data: ArticleInput } {
  const s = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const status = ['draft', 'published', 'archived'].includes(b?.status) ? b.status : 'draft';
  const d: ArticleInput = {
    headline: s(b?.headline, 300), subtitle: s(b?.subtitle, 500) || null,
    body_html: sanitizeBody(String(b?.body_html ?? '').slice(0, 200_000)),
    category_id: Number(b?.category_id), location_label: s(b?.location_label, 100) || null,
    byline: s(b?.byline, 100), source: s(b?.source, 200), image_credit: s(b?.image_credit, 200) || null,
    main_image_key: /^img\/\d{4}\/\d{2}\/[a-z0-9]+\.(webp|jpg|png)$/.test(String(b?.main_image_key)) ? String(b.main_image_key) : null,
    main_image_caption: s(b?.main_image_caption, 300) || null,
    is_featured: b?.is_featured ? 1 : 0, is_breaking: b?.is_breaking ? 1 : 0, status,
  };
  if (!d.headline) return { error: 'मराठी शीर्षक आवश्यक आहे.' };
  if (!d.byline) return { error: 'लेखक / संपादकीय नाव आवश्यक आहे.' };
  if (!d.source) return { error: 'बातमीचा स्रोत आवश्यक आहे.' };
  if (!Number.isInteger(d.category_id)) return { error: 'विभाग निवडा.' };
  if (d.status === 'published' && !d.body_html.replace(/<[^>]*>/g, '').trim()) return { error: 'बातमीचा मजकूर आवश्यक आहे.' };
  return { data: d };
}
