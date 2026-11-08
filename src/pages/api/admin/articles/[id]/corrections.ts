import type { APIRoute } from 'astro';
import { getDB } from '../../../../../lib/db';
import { json } from '../../../../../lib/articles';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const db = getDB(locals);
  const id = Number(params.id);
  const note = String(((await request.json().catch(() => ({}))) as any).note ?? '').trim().slice(0, 1000);
  if (!note) return json({ error: 'सुधारणा लिहा.' }, 400);
  if (!(await db.prepare('SELECT id FROM articles WHERE id = ?').bind(id).first())) return json({ error: 'बातमी सापडली नाही.' }, 404);
  await db.prepare('INSERT INTO corrections (article_id, note, created_by) VALUES (?,?,?)').bind(id, note, locals.user!.id).first();
  return json({ ok: true });
};
