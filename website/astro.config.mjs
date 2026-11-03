// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// The site is rendered on request (Node, @astrojs/node) from the content the API serves
// (/api/public/content, see src/lib/content.ts): publishing in the admin needs no build. A build is
// only needed when the site's code changes.
export default defineConfig({
  server: { port: 4322 },
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Uploaded images are resized by the API (/api/public/media/<id>/<width>.webp), not by Astro.
  image: { service: { entrypoint: 'astro/assets/services/noop' } },
  env: {
    // Read at runtime (access "secret" is how astro:env reads process.env on each start; none of these
    // is actually secret). Change them in docker/.env and restart; no rebuild.
    schema: {
      // Public URL of the site: canonical/OG links, the sitemap, feeds. The API's PUBLIC_SITE_URL.
      SITE_URL: envField.string({ context: 'server', access: 'secret', optional: true, url: true }),
      // Where the site's server reaches the API. Docker: http://server:3002.
      API_INTERNAL_URL: envField.string({ context: 'server', access: 'secret', default: 'http://127.0.0.1:3002', url: true }),
      // How often (ms) the site asks the API whether content changed. Publishing shows within this.
      CONTENT_POLL_MS: envField.number({ context: 'server', access: 'secret', default: 5000, int: true, gt: 0 }),
      // GA4 measurement ID. Unset = no analytics code at all.
      GA_MEASUREMENT_ID: envField.string({ context: 'server', access: 'secret', optional: true, startsWith: 'G-' }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // In development the API runs as a separate service (server/, port 3002). changeOrigin: false keeps
    // the browser's Host header (the API's same-origin checks compare it).
    server: {
      proxy: {
        '/api/': { target: 'http://127.0.0.1:3002', changeOrigin: false },
      },
    },
  },
});
