// Helpers for server-rendered admin forms (POST to the same page, then redirect).
export async function readForm(request: Request) {
  const f = await request.formData().catch(() => null);
  const str = (k: string, max = 1000) => String(f?.get(k) ?? '').trim().slice(0, max);
  return { f, str, int: (k: string) => Number(str(k, 20)), bool: (k: string) => (f?.get(k) ? 1 : 0) };
}
export const back = (url: URL | string, msg: string, err = false) => {
  const u = new URL(String(url));
  u.search = '';
  u.searchParams.set(err ? 'err' : 'ok', msg);
  return new Response(null, { status: 303, headers: { Location: u.pathname + u.search } });
};
export const flash = (url: URL) => ({ ok: url.searchParams.get('ok') ?? '', err: url.searchParams.get('err') ?? '' });
export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
export const isHttps = (s: string) => { try { return new URL(s).protocol === 'https:'; } catch { return false; } };
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
