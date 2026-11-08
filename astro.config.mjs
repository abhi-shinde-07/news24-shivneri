import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

// Pages render on the Worker so new articles appear without a rebuild.
// Free plan: 100,000 Worker requests/day; see the usage guard on the admin dashboard.
export default defineConfig({
  site: 'https://www.news24shivneri.in',
  output: 'server',
  // 'passthrough': images are served as uploaded (already shrunk in the browser), so no paid Cloudflare Images binding.
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [react()],
});
