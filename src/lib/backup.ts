import type { D1 } from './db';

type Bucket = {
  put(key: string, value: string, o?: unknown): Promise<unknown>;
  list(o: { prefix: string; limit?: number }): Promise<{ objects: { key: string; size: number }[] }>;
  delete(keys: string | string[]): Promise<void>;
};
// Sessions and login attempts are left out on purpose (short-lived, and contain security data).
const TABLES = ['users', 'categories', 'articles', 'article_images', 'corrections', 'article_revisions',
  'ads', 'videos', 'epapers', 'settings', 'media'];
const KEEP = 14;

// Writes backups/YYYY-MM-DD/<table>.json to R2, keeps the newest 14 days, and records total backup size.
export async function runBackup(db: D1, bucket: Bucket) {
  const day = new Date().toISOString().slice(0, 10);
  let bytes = 0;
  for (const t of TABLES) {
    const { results } = await db.prepare(`SELECT * FROM ${t}`).all<Record<string, unknown>>();
    const rows = t === 'users' ? results.map((r) => ({ ...r, totp_secret: r.totp_secret ? '[removed]' : null })) : results;
    const body = JSON.stringify(rows);
    bytes += body.length;
    await bucket.put(`backups/${day}/${t}.json`, body, { httpMetadata: { contentType: 'application/json' } });
  }
  const { objects } = await bucket.list({ prefix: 'backups/', limit: 1000 });
  const days = [...new Set(objects.map((o) => o.key.split('/')[1]))].sort().reverse();
  const old = objects.filter((o) => days.indexOf(o.key.split('/')[1]) >= KEEP);
  if (old.length) await bucket.delete(old.map((o) => o.key));
  const total = objects.filter((o) => !old.includes(o)).reduce((n, o) => n + o.size, 0);
  await db.prepare(`INSERT INTO settings (key, value) VALUES ('backup_bytes', ?), ('last_backup', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(String(total), day).first();
  return { day, tables: TABLES.length, bytes, kept: Math.min(days.length, KEEP) };
}
