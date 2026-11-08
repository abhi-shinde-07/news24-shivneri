import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

// Public pages are prerendered (static = free, unlimited on Cloudflare).
// Only routes with `export const prerender = false` (admin, API) run Worker code.
export default defineConfig({
  site: 'https://www.news24shivneri.in',
  output: 'static',
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [react()],
});
