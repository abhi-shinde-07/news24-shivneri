# NEWS24 SHIVNERI – Runbook

Short, practical steps for the person running the site. Commands run from the project folder.

## 1. Take a manual backup
- **Easiest:** Admin → Dashboard → **आता बॅकअप घ्या**. This writes every content table as JSON to R2 under
  `backups/latest/` in the private `news24-backups` bucket and replaces the previous copy (one backup only, text tables only, no images).
  It also runs automatically every night at 02:30 IST. For older history use D1 Time Travel (section 2).
- **Full SQL copy of the live database** (to your computer):
  ```
  npx wrangler d1 export news24-db --remote --output=backup-YYYY-MM-DD.sql
  ```
  Keep this file private: it contains the admin password hashes.

## 2. Restore from a backup
1. Best option: restore from an SQL export (step 1):
   ```
   npx wrangler d1 execute news24-db --remote --file=backup-YYYY-MM-DD.sql
   ```
   Run it against an empty database (create a new D1 database, apply it, then point `database_id` in `wrangler.jsonc` at it).
2. From the R2 JSON backups: download `backups/latest/<table>.json` from the Cloudflare dashboard (R2 → news24-backups)
   and re-insert the rows you need. Use this to recover single articles or settings.
3. D1 also has **Time Travel** (last 30 days, free):
   ```
   npx wrangler d1 time-travel restore news24-db --timestamp=2026-11-08T10:00:00Z
   ```

## 3. Change or rotate the admin password
- Logged in: Admin → **सुरक्षा / पासवर्ड** → change the password (min 12 characters). All other devices are logged out.
- Locked out: create a new hash and update the row:
  ```
  node scripts/make-admin.mjs "email@example.com" "Name"     # writes seed/admin.sql (git-ignored)
  ```
  Then copy the hash from `seed/admin.sql` and run
  `npx wrangler d1 execute news24-db --remote --command "UPDATE users SET password_hash='<hash>' WHERE email='email@example.com'"`.
- Lost the 2-step-login phone: `UPDATE users SET totp_enabled=0, totp_secret=NULL WHERE email='…'` with the same command.

## 4. If the site nears a free limit
The Dashboard shows R2 storage, D1 size and an estimate of today's D1 writes; it turns yellow at 70% and red at 80%,
and above 80% every admin save/upload asks for confirmation. **Cloudflare has no hard spending cap** – these
warnings only control this site.

| Limit (free) | What to do |
|---|---|
| R2 10 GB | E-paper → delete PDFs older than X months; delete unused images in Media Library. |
| D1 5 GB | Unlikely. Delete old article revisions: `DELETE FROM article_revisions WHERE saved_at < date('now','-1 year')`. |
| D1 100,000 writes/day | Only admin actions and ad clicks write. Check for a stuck script or bot hitting `/go/…`. |
| Workers 100,000 requests/day | Check Cloudflare → Workers → Metrics. If traffic is real, consider the $5/month Workers Paid plan. Turn on Cloudflare cache rules for `/news/*` if needed. |

If requests fail with “limit exceeded”, the site is down until the daily reset (00:00 UTC = 05:30 IST) unless you upgrade.

## 5. Demo data (local only)
- Load: `npm run db:local` then `npm run db:demo-local`
- Remove: `npx wrangler d1 execute news24-db --local --file=seed/demo-remove.sql`
- Never run these with `--remote`.
