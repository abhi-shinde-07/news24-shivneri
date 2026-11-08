# NEWS24 SHIVNERI

Marathi digital newspaper for Pune district – www.news24shivneri.in – “निर्भिड सत्याचा बुलंद आवाज”.
Cloudflare Workers + Astro 7 + React + D1 + R2, built to stay on the free tier.

## Run locally
```
npm install
npx wrangler login
npm run db:local          # applies every file in migrations/ to the local database
npm run db:demo-local     # optional: demo Pune news, photos, ad and e-paper (LOCAL ONLY)
npm run dev
```
Create an admin: `node scripts/make-admin.mjs "you@example.com" "Name"` then `npm run db:admin-local`.

## Deploy
Push to `main` – Cloudflare builds and deploys automatically. When a new file appears in `migrations/`, run
`npm run db:remote` once (before or right after the push).

## What is where
| Public | Admin (`/admin`, login required, noindex, CSRF-checked) |
|---|---|
| `/`, `/latest`, `/category/<slug>` (20 per page) | Dashboard: counts, free-limit meters, manual backup |
| `/news/<id>` – source, byline, dates, corrections, WhatsApp/copy share | Articles: create, edit, archive, **delete**, search, edit history with diff |
| `/videos`, `/videos/<id>` (YouTube, loads only on click) | Ads: positions, dates, https click URL, click counts |
| `/photos` (gallery from Media Library) | Media Library: upload, “show in gallery”, caption, delete |
| `/epaper`, `/epaper/<date>` (pdf.js viewer) | Videos, E-paper (25 MB/PDF, retention), Categories |
| `/about`, `/contact`, `/editorial-policy`, `/corrections` | Website Settings, SEO Settings, Security (password, 2-step login) |
| `/sitemap.xml`, `/news-sitemap.xml`, `/robots.txt`, `/rss.xml` | |

## Editorial rules
- Every article shows its source, byline and publish date; edits show an “updated” time.
- Corrections are public: under the article and on `/corrections`.
- Ads are always labelled “जाहिरात” and link with `rel="sponsored"`.

## Free-tier notes
- No per-page-view data is stored. Ads count clicks only, through `/go/<id>`, one per visitor per hour, bots ignored.
- Ads, sitemaps and RSS are cached at the edge (5–10 minutes).
- Fonts are self-hosted (no Google Fonts requests).
- See `docs/RUNBOOK.md` for backups, restore, password reset and what to do near a free limit.
