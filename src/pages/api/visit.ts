import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|lighthouse|headless/i;

// Every page view adds one (site.js calls this once per page load); bots only read the number.
export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals);
  const bot = BOT.test(request.headers.get('user-agent') ?? '');
  const r = bot
    ? await db.prepare(`SELECT value FROM counters WHERE name = 'visits'`).first<{ value: number }>()
    : await db.prepare(`UPDATE counters SET value = value + 1 WHERE name = 'visits' RETURNING value`).first<{ value: number }>();
  return new Response(JSON.stringify({ visits: r?.value ?? 1000 }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
};
