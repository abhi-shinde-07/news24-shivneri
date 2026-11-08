import type { D1 } from './db';

type Bucket = {
  put(key: string, value: string, o?: unknown): Promise<unknown>;
  list(o: { prefix: string; limit?: number }): Promise<{ objects: { key: string; size: number }[] }>;
  delete(keys: string | string[]): Promise<void>;
};
// Sessions and login attempts are left out on purpose (short-lived, and contain security data).
const TABLES = ['users', 'categories', 'articles', 'article_images', 'corrections', 'article_revisions',
  'ads', 'videos', 'epapers', 'settings', 'media'];
const DIR = 'backups/latest/';

// One backup only: backups/latest/<table>.json is overwritten each run and anything else under backups/
// (older dated copies) is deleted, so backup storage never grows. Text tables only - no images or PDFs.
// Older history: D1 Time Travel can restore any point in the last 30 days (see docs/RUNBOOK.md).
export async function runBackup(db: D1, bucket: Bucket) {
  const day = new Date().toISOString().slice(0, 10);
  let bytes = 0;
  for (const t of TABLES) {
    const { results } = await db.prepare(`SELECT * FROM ${t}`).all<Record<string, unknown>>();
    const rows = t === 'users' ? results.map((r) => ({ ...r, totp_secret: r.totp_secret ? '[removed]' : null })) : results;
    const body = JSON.stringify({ backed_up: day, rows });
    bytes += body.length;
    await bucket.put(DIR + `${t}.json`, body, { httpMetadata: { contentType: 'application/json' } });
  }
  const { objects } = await bucket.list({ prefix: 'backups/', limit: 1000 });
  const old = objects.filter((o) => !o.key.startsWith(DIR)).map((o) => o.key);
  if (old.length) await bucket.delete(old);
  await db.prepare(`INSERT INTO settings (key, value) VALUES ('backup_bytes', ?), ('last_backup', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(String(bytes), day).first();
  return { day, tables: TABLES.length, bytes, removed: old.length };
}
