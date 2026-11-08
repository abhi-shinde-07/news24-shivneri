import { env } from 'cloudflare:workers';
// Minimal D1 typing (avoids extra dependencies).
type Stmt = {
  bind(...a: unknown[]): Stmt;
  all<T>(): Promise<{ results: T[]; meta?: { size_after?: number } }>;
  first<T>(): Promise<T | null>;
};
export type D1 = { prepare(q: string): Stmt };
// Bindings come from cloudflare:workers (Astro 6+); the locals argument is kept so call sites stay unchanged.
export const getDB = (_locals?: any): D1 => (env as any).DB;

export type ArticleItem = {
  id: number; headline: string; subtitle: string | null; byline: string; source: string;
  location_label: string | null; main_image_key: string | null; main_image_caption: string | null; youtube_id: string | null;
  is_featured: number; is_breaking: number; published_at: string; category_name: string; category_slug: string;
};
export type Article = ArticleItem & { body_html: string; image_credit: string | null; updated_at: string };
export type Correction = { note: string; created_at: string };
export type Video = { id: number; youtube_id: string; title: string; description: string | null; is_featured: number; published_at: string };
export type Epaper = { id: number; edition_date: string; title: string; edition_name: string; pdf_key: string; cover_key: string | null; size: number };
export type Category = { id: number; slug: string; name_mr: string };

const LIST = `a.id, a.headline, a.subtitle, a.byline, a.source, a.location_label, a.main_image_key, a.youtube_id,
  a.main_image_caption, a.is_featured, a.is_breaking, a.published_at, c.name_mr AS category_name, c.slug AS category_slug`;
const FROM = `FROM articles a JOIN categories c ON c.id = a.category_id`;
// Only live articles: published and not scheduled in the future.
const LIVE = `a.status = 'published' AND a.published_at <= strftime('%Y-%m-%dT%H:%M:%SZ','now')`;

export const getNavCategories = async (db: D1) =>
  (await db.prepare('SELECT id, slug, name_mr FROM categories WHERE is_active = 1 ORDER BY sort_order, id').all<Category>()).results;

export async function getHome(db: D1) {
  const { results } = await db.prepare(
    `SELECT ${LIST} ${FROM} WHERE ${LIVE} ORDER BY a.published_at DESC LIMIT 18`).all<ArticleItem>();
  const leadIdx = Math.max(0, results.findIndex((a) => a.is_featured));
  const lead = results[leadIdx] ?? null;
  const rest = results.filter((_, i) => i !== leadIdx);
  const breaking = results.filter((a) => a.is_breaking);
  return { lead, others: rest.slice(0, 3), more: rest.slice(3, 7), top: rest.slice(7, 15), breaking };
}

// Up to 4 recent articles per active category, in one query.
export async function getCategoryBlocks(db: D1) {
  const { results } = await db.prepare(
    `SELECT * FROM (SELECT ${LIST}, c.sort_order AS so,
       ROW_NUMBER() OVER (PARTITION BY a.category_id ORDER BY a.published_at DESC) AS rn
     ${FROM} WHERE ${LIVE} AND c.is_active = 1) WHERE rn <= 4 ORDER BY so, published_at DESC`).all<ArticleItem>();
  const blocks: { name: string; slug: string; items: ArticleItem[] }[] = [];
  for (const a of results) {
    let b = blocks.find((x) => x.slug === a.category_slug);
    if (!b) blocks.push((b = { name: a.category_name, slug: a.category_slug, items: [] }));
    b.items.push(a);
  }
  return blocks;
}

// Fetch one extra row to know whether a next page exists.
async function pageOf(db: D1, where: string, binds: unknown[], page: number, per: number) {
  const { results } = await db.prepare(
    `SELECT ${LIST} ${FROM} WHERE ${LIVE} ${where} ORDER BY a.published_at DESC LIMIT ? OFFSET ?`)
    .bind(...binds, per + 1, (page - 1) * per).all<ArticleItem>();
  return { articles: results.slice(0, per), hasNext: results.length > per };
}

export const getLatest = (db: D1, page = 1, per = 20) => pageOf(db, '', [], page, per);

export async function getCategory(db: D1, slug: string, page = 1, per = 20) {
  const cat = await db.prepare(`SELECT id, name_mr FROM categories WHERE slug = ? AND is_active = 1`)
    .bind(slug).first<{ id: number; name_mr: string }>();
  if (!cat) return null;
  return { name: cat.name_mr, ...(await pageOf(db, 'AND a.category_id = ?', [cat.id], page, per)) };
}

export async function getArticle(db: D1, id: number) {
  const article = await db.prepare(
    `SELECT ${LIST}, a.body_html, a.image_credit, a.updated_at ${FROM} WHERE ${LIVE} AND a.id = ?`)
    .bind(id).first<Article>();
  if (!article) return null;
  const { results: corrections } = await db.prepare(
    `SELECT note, created_at FROM corrections WHERE article_id = ? ORDER BY created_at DESC`)
    .bind(id).all<Correction>();
  const { results: related } = await db.prepare(
    `SELECT ${LIST} ${FROM} WHERE ${LIVE} AND a.category_id = (SELECT category_id FROM articles WHERE id = ?) AND a.id <> ?
     ORDER BY a.published_at DESC LIMIT 4`).bind(id, id).all<ArticleItem>();
  return { article, corrections, related };
}

export const getAllCorrections = async (db: D1) =>
  (await db.prepare(
    `SELECT k.note, k.created_at, a.id AS article_id, a.headline FROM corrections k JOIN articles a ON a.id = k.article_id
     WHERE ${LIVE} ORDER BY k.created_at DESC LIMIT 500`)
    .all<{ note: string; created_at: string; article_id: number; headline: string }>()).results;

export async function getVideos(db: D1, page = 1, per = 12) {
  const { results } = await db.prepare(
    `SELECT id, youtube_id, title, description, is_featured, published_at FROM videos WHERE status = 'published'
     ORDER BY published_at DESC LIMIT ? OFFSET ?`).bind(per + 1, (page - 1) * per).all<Video>();
  return { videos: results.slice(0, per), hasNext: results.length > per };
}
export const getFeaturedVideos = async (db: D1, n = 4) =>
  (await db.prepare(
    `SELECT id, youtube_id, title, description, is_featured, published_at FROM videos WHERE status = 'published'
     ORDER BY is_featured DESC, published_at DESC LIMIT ?`).bind(n).all<Video>()).results;

export const getLatestEpaper = (db: D1) =>
  db.prepare(`SELECT id, edition_date, title, edition_name, pdf_key, cover_key, size FROM epapers WHERE status = 'published'
    ORDER BY edition_date DESC LIMIT 1`).first<Epaper>();
