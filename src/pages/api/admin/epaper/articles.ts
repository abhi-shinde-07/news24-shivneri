import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { json } from '../../../../lib/articles';
import { epArticles } from '../../../../lib/epaper';
import { isDate } from '../../../../lib/admin';

// Any older news for the e-paper builder: search by headline and/or a date range.
export const GET: APIRoute = async ({ url, locals }) => {
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  const from = url.searchParams.get('from') ?? '', to = url.searchParams.get('to') ?? '';
  const arts = await epArticles(getDB(locals), { q, from: isDate(from) ? from : '', to: isDate(to) ? to : '', limit: 150 });
  return json({ arts });
};
