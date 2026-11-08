import type { D1 } from './db';

export const R2_LIMIT = 10 * 1024 ** 3; // free tier: 10 GB
export const D1_LIMIT = 5 * 1024 ** 3;  // free tier: 5 GB
export const WRITES_LIMIT = 100_000;    // D1 rows written per day

export type Usage = { r2: number; d1: number; writesToday: number; pct: number };

// Storage comes from our own tables (media, e-papers, backups) plus D1's reported size.
// "Writes today" is estimated from row timestamps, so measuring it costs no writes.
export async function getUsage(db: D1): Promise<Usage> {
  const r = await db.prepare(
    `SELECT (SELECT COALESCE(SUM(size),0) FROM media) + (SELECT COALESCE(SUM(size),0) FROM epapers)
       + (SELECT COALESCE(CAST(value AS INTEGER),0) FROM settings WHERE key = 'backup_bytes') AS r2`).all<{ r2: number }>();
  const today = new Date().toISOString().slice(0, 10);
  const w = await db.prepare(
    `SELECT (SELECT COUNT(*) FROM articles WHERE updated_at >= ?1) + (SELECT COUNT(*) FROM article_revisions WHERE saved_at >= ?1)
       + (SELECT COUNT(*) FROM media WHERE created_at >= ?1) + (SELECT COUNT(*) FROM corrections WHERE created_at >= ?1)
       + (SELECT COUNT(*) FROM login_attempts WHERE attempted_at >= ?1) + (SELECT COUNT(*) FROM sessions WHERE created_at >= ?1) AS n`)
    .bind(today).first<{ n: number }>();
  const r2 = r.results[0]?.r2 ?? 0;
  const d1 = r.meta?.size_after ?? 0;
  const writesToday = w?.n ?? 0;
  const pct = Math.max(r2 / R2_LIMIT, d1 / D1_LIMIT, writesToday / WRITES_LIMIT) * 100;
  return { r2, d1, writesToday, pct };
}
