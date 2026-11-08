// Edge cache via the Workers Cache API. Falls back to building every time where it is unavailable.
export async function edgeCached(locals: any, key: string, seconds: number, build: () => Promise<Response>) {
  const cache: Cache | undefined = (globalThis as any).caches?.default;
  if (!cache) return build();
  const req = new Request(`https://cache.news24.internal/${key}`);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await build();
  if (res.status === 200) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set('Cache-Control', `public, max-age=${seconds}, s-maxage=${seconds}`);
    const put = cache.put(req, copy);
    locals?.cfContext?.waitUntil ? locals.cfContext.waitUntil(put) : await put;
  }
  return res;
}

// Cached JSON value (no extra Worker request: used inside a page render).
export async function cachedJson<T>(locals: any, key: string, seconds: number, load: () => Promise<T>): Promise<T> {
  const res = await edgeCached(locals, key, seconds, async () =>
    new Response(JSON.stringify(await load()), { headers: { 'Content-Type': 'application/json' } }));
  return res.json() as Promise<T>;
}

// Short-lived marker used to de-duplicate ad clicks without writing to D1.
// Checked in this Worker's memory first, then in the edge cache (shared across Workers in a data centre).
const memo = new Map<string, number>();
export async function seenRecently(key: string, seconds: number) {
  const now = Date.now();
  if ((memo.get(key) ?? 0) > now) return true;
  if (memo.size > 5000) memo.clear();
  memo.set(key, now + seconds * 1000);
  const cache: Cache | undefined = (globalThis as any).caches?.default;
  if (!cache) return false;
  const req = new Request(`https://cache.news24.internal/seen/${key}`);
  if (await cache.match(req)) return true;
  await cache.put(req, new Response('1', { headers: { 'Cache-Control': `max-age=${seconds}` } }));
  return false;
}

// Drop a cached entry right away (e.g. after an admin changes ads), instead of waiting for it to expire.
export async function purgeCached(key: string) {
  const cache: Cache | undefined = (globalThis as any).caches?.default;
  if (cache) await cache.delete(new Request(`https://cache.news24.internal/${key}`));
}
