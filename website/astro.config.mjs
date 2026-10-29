// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import tailwindcss from '@tailwindcss/vite';
import sitemapGuard from './src/integrations/sitemap-guard';
import { loadEnv } from 'vite';

// The Keystatic admin (/keystatic) needs on-demand routes, so it is only mounted by `astro dev`.
// `astro build` stays fully static — the production image never contains the CMS.
const isDev = process.argv.includes('dev');

// This file runs before Astro loads .env files, so read them here the same way Astro/Vite do for
// astro:env: .env, .env.local, .env.<mode>, .env.<mode>.local — and let real environment variables win.
const env = { ...loadEnv(isDev ? 'development' : 'production', process.cwd(), ''), ...process.env };

export default defineConfig({
  server: { port: 4322 },
  site: env.SITE_URL || 'https://blog.acme.example',
  output: 'static',
  env: {
    schema: {
      // GA4 measurement ID, baked in at build time. Unset = no analytics code at all.
      GA_MEASUREMENT_ID: envField.string({ context: 'server', access: 'public', optional: true, startsWith: 'G-' }),
    },
  },
  integrations: [react(), markdoc(), sitemapGuard(), ...(isDev ? [keystatic()] : [])],
  vite: {
    plugins: [tailwindcss()],
    // In development the API runs as a separate service (server/, port 3002). changeOrigin: false keeps
    // the browser's Host header. /api/keystatic/* is Keystatic's own dev API, served by Astro, so it is
    // excluded (a key starting with ^ is a RegExp).
    server: {
      proxy: {
        '^/api/(?!keystatic(/|$))': { target: 'http://127.0.0.1:3002', changeOrigin: false },
      },
    },
  },
});
