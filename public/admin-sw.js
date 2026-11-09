// Service worker for the installable admin app (scope /admin).
// Admin pages are never cached (they contain private data and must always be fresh).
// The offline notice is built here, so installing needs no extra download that could fail.
const VERSION = 'n24-admin-v2';
const OFFLINE_HTML = `<!doctype html><html lang="mr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>इंटरनेट नाही – N24 Admin</title><meta name="theme-color" content="#c4001f"><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f3ef;font-family:system-ui,sans-serif;color:#1c1917;text-align:center;padding:1rem}
.b{background:#fff;border:1px solid #e2ded8;border-radius:16px;padding:2rem 1.5rem;max-width:340px}h1{font-size:1.25rem;margin:.2rem 0 .5rem}p{color:#57534e;line-height:1.6}
a{display:inline-block;margin-top:.8rem;background:#c4001f;color:#fff;padding:.65rem 1.3rem;border-radius:8px;text-decoration:none}</style></head>
<body><div class="b"><div style="font-size:3rem">📡</div><h1>इंटरनेट कनेक्शन नाही</h1>
<p>बातम्या जतन करण्यासाठी इंटरनेट लागते. कनेक्शन तपासून पुन्हा प्रयत्न करा.</p><a href="/admin">पुन्हा प्रयत्न करा</a></div></body></html>`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return; // everything else goes straight to the network
  e.respondWith(fetch(e.request).catch(() =>
    new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
