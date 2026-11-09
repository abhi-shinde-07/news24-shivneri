import { defineMiddleware } from 'astro:middleware';
import { getDB } from './lib/db';
import { getUser } from './lib/auth';

const MEDIA = ((import.meta.env.PUBLIC_MEDIA_BASE as string | undefined) ?? '').replace(/\/$/, '');
const mediaOrigin = MEDIA ? new URL(MEDIA).origin : '';

// Public pages run no inline scripts; admin needs 'unsafe-inline' for Astro's island loader.
function csp(admin: boolean) {
  return [
    "default-src 'self'",
    `script-src 'self'${admin ? " 'unsafe-inline'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com ${mediaOrigin}`.trim(),
    "font-src 'self'",
    `connect-src 'self' ${mediaOrigin}`.trim(),
    'frame-src https://www.youtube-nocookie.com https://www.youtube.com',
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');
}

function secure(res: Response, url: URL, admin: boolean) {
  const headers = new Headers(res.headers);
  headers.set('Content-Security-Policy', csp(admin));
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  if (url.protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (admin) {
    headers.set('Cache-Control', 'no-store');
    headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export const onRequest = defineMiddleware(async (ctx, next) => {
  // One address for readers and Google: news24shivneri.in -> www.news24shivneri.in
  if (ctx.url.hostname === 'news24shivneri.in' || (ctx.url.hostname.endsWith('news24shivneri.in') && ctx.url.protocol === 'http:'))
    return Response.redirect(`https://www.news24shivneri.in${ctx.url.pathname}${ctx.url.search}`, 301);
  const path = ctx.url.pathname;
  const isApi = path.startsWith('/api/admin');
  if (!path.startsWith('/admin') && !isApi) return secure(await next(), ctx.url, false);

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
  return secure(await next(), ctx.url, true);
});
