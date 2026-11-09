// Worker entry: the Astro site plus the nightly backup (Cron Trigger in wrangler.jsonc).
import astro from '@astrojs/cloudflare/entrypoints/server';
import { runBackup } from './lib/backup';

export default {
  fetch: astro.fetch,
  // Text tables only (JSON) into the private BACKUPS bucket; images and PDFs are never copied.
  async scheduled(_event: unknown, env: any, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(runBackup(env.DB, env.BACKUPS));
  },
};
