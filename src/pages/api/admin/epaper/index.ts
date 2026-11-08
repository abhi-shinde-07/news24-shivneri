import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { json, nowIso } from '../../../../lib/articles';
import { getBucket, sniffImage } from '../../../../lib/media';
import { epaperKey, isPdf, MAX_COVER, MAX_PDF } from '../../../../lib/epaper';
import { isDate } from '../../../../lib/admin';

// Upload one edition: PDF (required) + cover image of page 1 (made in the browser, optional).
export const POST: APIRoute = async ({ request, locals }) => {
  const form = await request.formData().catch(() => null);
  const s = (k: string, max: number) => String(form?.get(k) ?? '').trim().slice(0, max);
  const date = s('edition_date', 10), title = s('title', 200), edition = s('edition_name', 100) || 'स्थानिक आवृत्ती';
  const status = s('status', 10) === 'published' ? 'published' : 'draft';
  const pdf = form?.get('pdf'), cover = form?.get('cover');
  if (!isDate(date)) return json({ error: 'तारीख निवडा.' }, 400);
  if (!title) return json({ error: 'शीर्षक लिहा.' }, 400);
  if (!(pdf instanceof File)) return json({ error: 'PDF फाईल निवडा.' }, 400);
  if (pdf.size > MAX_PDF) return json({ error: `PDF खूप मोठी आहे (कमाल ${MAX_PDF / 1048576} MB).` }, 400);
  const db = getDB(locals);
  if (await db.prepare('SELECT id FROM epapers WHERE edition_date = ?').bind(date).first())
    return json({ error: 'या तारखेचा ई-पेपर आधीच आहे. आधी तो हटवा.' }, 409);
  const bytes = new Uint8Array(await pdf.arrayBuffer());
  if (!isPdf(bytes)) return json({ error: 'ही PDF फाईल नाही.' }, 400);
  const bucket = getBucket(locals);
  const pdfKey = epaperKey(date, 'pdf');
  await bucket.put(pdfKey, bytes, { httpMetadata: { contentType: 'application/pdf' } });
  let coverKey: string | null = null, size = bytes.length;
  if (cover instanceof File && cover.size > 0 && cover.size <= MAX_COVER) {
    const cb = new Uint8Array(await cover.arrayBuffer());
    const kind = sniffImage(cb);
    if (kind) {
      coverKey = epaperKey(date, kind.ext);
      await bucket.put(coverKey, cb, { httpMetadata: { contentType: kind.mime } });
      size += cb.length;
    }
  }
  const r = await db.prepare(
    `INSERT INTO epapers (edition_date, title, edition_name, pdf_key, cover_key, size, status, published_at) VALUES (?,?,?,?,?,?,?,?) RETURNING id`)
    .bind(date, title, edition, pdfKey, coverKey, size, status, status === 'published' ? nowIso() : null).first<{ id: number }>();
  return json({ id: r!.id });
};
