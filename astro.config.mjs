import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

// Pages render on the Worker so new articles appear without a rebuild.
// Free plan: 100,000 Worker requests/day; usage guard comes in a later phase.
export default defineConfig({
  site: 'https://www.news24shivneri.in',
  output: 'server',
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [react()],
});
