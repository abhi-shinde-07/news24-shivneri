import { defineMiddleware } from 'astro:middleware';
import { getDB } from './lib/db';
import { getUser } from './lib/auth';

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  const isApi = path.startsWith('/api/admin');
  if (!path.startsWith('/admin') && !isApi) return next();

  // CSRF: state-changing requests must come from our own origin
  if (ctx.request.method !== 'GET' && ctx.request.method !== 'HEAD') {
    const origin = ctx.request.headers.get('origin');
    if (!origin || new URL(origin).host !== ctx.url.host) return new Response('Forbidden', { status: 403 });
  }
  if (path !== '/admin/login') {
    const user = await getUser(getDB(ctx.locals), ctx.request);
    if (!user) {
      return isApi
        ? new Response(JSON.stringify({ error: 'लॉगिन आवश्यक आहे.' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
        : ctx.redirect('/admin/login');
    }
    ctx.locals.user = user;
  }
  const res = await next();
  const headers = new Headers(res.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(res.body, { status: res.status, headers });
});
