import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';
import { sha256Hex } from '../../lib/auth';
import { seenRecently } from '../../lib/cache';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|curl|wget|python|headless/i;

// The only place ad clicks are counted. One count per visitor per ad per hour; bots never count.
export const GET: APIRoute = async ({ params, locals, request }) => {
  const db = getDB(locals);
  const id = Number(params.id);
  const ad = Number.isInteger(id) ? await db.prepare(
    `SELECT id, click_url FROM ads WHERE id = ? AND status = 'active' AND start_date <= date('now') AND end_date >= date('now')`)
    .bind(id).first<{ id: number; click_url: string | null }>() : null;
  if (!ad?.click_url || !ad.click_url.startsWith('https://')) return new Response(null, { status: 302, headers: { Location: '/' } });
  const ua = request.headers.get('user-agent') ?? '';
  if (ua && !BOT.test(ua)) {
    const visitor = await sha256Hex(`${request.headers.get('cf-connecting-ip') ?? 'local'}|${ua}|${id}`);
    if (!(await seenRecently(`ad/${visitor}`, 3600)))
      await db.prepare('UPDATE ads SET click_count = click_count + 1 WHERE id = ?').bind(id).first();
  }
  return new Response(null, { status: 302, headers: { Location: ad.click_url, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
};
