// Minimal D1 typing (avoids extra dependencies).
type Stmt = { bind(...a: unknown[]): Stmt; all<T>(): Promise<{ results: T[] }>; first<T>(): Promise<T | null> };
export type D1 = { prepare(q: string): Stmt };
export const getDB = (locals: any): D1 => locals.runtime.env.DB;

export type ArticleItem = {
  id: number; headline: string; subtitle: string | null; byline: string; source: string;
  location_label: string | null; main_image_key: string | null; main_image_caption: string | null;
  is_featured: number; is_breaking: number; published_at: string; category_name: string; category_slug: string;
};
export type Article = ArticleItem & { body_html: string; image_credit: string | null; updated_at: string };
export type Correction = { note: string; created_at: string };

const LIST = `a.id, a.headline, a.subtitle, a.byline, a.source, a.location_label, a.main_image_key,
  a.main_image_caption, a.is_featured, a.is_breaking, a.published_at, c.name_mr AS category_name, c.slug AS category_slug`;
const FROM = `FROM articles a JOIN categories c ON c.id = a.category_id`;
// Only live articles: published and not scheduled in the future.
const LIVE = `a.status = 'published' AND a.published_at <= strftime('%Y-%m-%dT%H:%M:%SZ','now')`;

export async function getHome(db: D1) {
  const { results } = await db.prepare(
    `SELECT ${LIST} ${FROM} WHERE ${LIVE} ORDER BY a.published_at DESC LIMIT 14`).all<ArticleItem>();
  const leadIdx = Math.max(0, results.findIndex((a) => a.is_featured));
  const lead = results[leadIdx] ?? null;
  const rest = results.filter((_, i) => i !== leadIdx);
  const breaking = results.find((a) => a.is_breaking) ?? null;
  return { lead, others: rest.slice(0, 3), top: rest.slice(3, 11), breaking };
}

export const getLatest = async (db: D1, limit = 30) =>
  (await db.prepare(`SELECT ${LIST} ${FROM} WHERE ${LIVE} ORDER BY a.published_at DESC LIMIT ?`)
    .bind(limit).all<ArticleItem>()).results;

export async function getCategory(db: D1, slug: string) {
  const cat = await db.prepare(`SELECT id, name_mr FROM categories WHERE slug = ? AND is_active = 1`)
    .bind(slug).first<{ id: number; name_mr: string }>();
  if (!cat) return null;
  const { results } = await db.prepare(
    `SELECT ${LIST} ${FROM} WHERE ${LIVE} AND a.category_id = ? ORDER BY a.published_at DESC LIMIT 30`)
    .bind(cat.id).all<ArticleItem>();
  return { name: cat.name_mr, articles: results };
}

export async function getArticle(db: D1, id: number) {
  const article = await db.prepare(
    `SELECT ${LIST}, a.body_html, a.image_credit, a.updated_at ${FROM} WHERE ${LIVE} AND a.id = ?`)
    .bind(id).first<Article>();
  if (!article) return null;
  const { results: corrections } = await db.prepare(
    `SELECT note, created_at FROM corrections WHERE article_id = ? ORDER BY created_at DESC`)
    .bind(id).all<Correction>();
  return { article, corrections };
}
