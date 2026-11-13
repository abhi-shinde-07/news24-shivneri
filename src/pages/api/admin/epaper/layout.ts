import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { json, nowIso } from '../../../../lib/articles';
import { getBucket, sniffImage } from '../../../../lib/media';
import { cleanLayout, epaperKey, MAX_COVER } from '../../../../lib/epaper';
import { isDate } from '../../../../lib/admin';

// Save an e-paper made in the builder: layout JSON plus a cover picture of page 1 (made in the browser).
export const POST: APIRoute = async ({ request, locals }) => {
  const form = await request.formData().catch(() => null);
  const s = (k: string, max: number) => String(form?.get(k) ?? '').trim().slice(0, max);
  const id = Number(s('id', 12)) || 0;
  const date = s('edition_date', 10), title = s('title', 200), edition = s('edition_name', 100) || 'पुणे जिल्हा आवृत्ती';
  const status = s('status', 10) === 'published' ? 'published' : 'draft';
  if (!isDate(date)) return json({ error: 'तारीख निवडा.' }, 400);
  if (!title) return json({ error: 'शीर्षक लिहा.' }, 400);
  const raw = s('layout', 400_000);
  let layout;
  try { layout = cleanLayout(JSON.parse(raw)); } catch { layout = null; }
  if (!layout || !layout.pages.some((p) => p.items.length)) return json({ error: 'किमान एक बातमी जोडा.' }, 400);
  const db = getDB(locals);
  const clash = await db.prepare('SELECT id FROM epapers WHERE edition_date = ? AND id <> ?').bind(date, id).first();
  if (clash) return json({ error: 'या तारखेचा ई-पेपर आधीच आहे. तारीख बदला किंवा जुना हटवा.' }, 409);
  const old = id ? await db.prepare('SELECT cover_key FROM epapers WHERE id = ?').bind(id).first<{ cover_key: string | null }>() : null;
  if (id && !old) return json({ error: 'ई-पेपर सापडला नाही.' }, 404);

  const bucket = getBucket(locals);
  let coverKey = old?.cover_key ?? null, size = raw.length;
  const cover = form?.get('cover');
  if (cover instanceof File && cover.size > 0 && cover.size <= MAX_COVER) {
    const cb = new Uint8Array(await cover.arrayBuffer());
    const kind = sniffImage(cb);
    if (kind) {
      if (coverKey) await bucket.delete(coverKey);
      coverKey = epaperKey(date, kind.ext);
      await bucket.put(coverKey, cb, { httpMetadata: { contentType: kind.mime } });
      size += cb.length;
    }
  }
  const body = JSON.stringify(layout);
  if (id) {
    await db.prepare(`UPDATE epapers SET edition_date=?, title=?, edition_name=?, layout=?, cover_key=?, size=?, status=?,
      published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, ?) ELSE published_at END WHERE id=?`)
      .bind(date, title, edition, body, coverKey, size, status, status, nowIso(), id).first();
    return json({ id });
  }
  const r = await db.prepare(
    `INSERT INTO epapers (edition_date, title, edition_name, pdf_key, cover_key, size, status, published_at, layout) VALUES (?,?,?,'',?,?,?,?,?) RETURNING id`)
    .bind(date, title, edition, coverKey, size, status, status === 'published' ? nowIso() : null, body).first<{ id: number }>();
  return json({ id: r!.id });
};
