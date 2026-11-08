# NEWS24 SHIVNERI – Phase 1

## Run locally
```
npm install
npx wrangler login
npx wrangler d1 create news24-db        # copy database_id into wrangler.jsonc
npx wrangler r2 bucket create news24-media
npm run db:local                        # applies migrations/0001_init.sql locally
npm run dev
```
## Notes
- Public pages are static; only /admin and /api (later phases) run Worker code.
- Ads: impressions are not stored (saves D1 writes); only clicks.
- Fonts load from Google Fonts for now; self-host/subset later for speed.
