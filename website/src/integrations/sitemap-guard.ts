import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

/**
 * Fails `astro build` when dist/sitemap.xml and the built HTML pages disagree:
 *   - an indexable page that the sitemap doesn't list (e.g. a new hand-written src/pages/*.astro
 *     that nobody added to getSiteUrls() in src/lib/seo.ts), or
 *   - a sitemap URL with no page behind it.
 * Pages rendered with a robots `noindex` meta tag (BaseLayout's `noindex` prop) are exempt.
 */
export default function sitemapGuard(): AstroIntegration {
  return {
    name: 'sitemap-guard',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const sitemapFile = join(root, 'sitemap.xml');
        if (!existsSync(sitemapFile)) throw new Error('sitemap-guard: dist/sitemap.xml was not generated');

        const listed = new Set(
          [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname),
        );

        const pages = new Set<string>();
        const walk = (d: string) => {
          for (const entry of readdirSync(d, { withFileTypes: true })) {
            const p = join(d, entry.name);
            if (entry.isDirectory()) walk(p);
            else if (entry.name.endsWith('.html')) {
              const rel = relative(root, p).split(sep).join('/');
              if (rel === '404.html' || rel === '500.html') continue;
              if (/<meta name="robots" content="noindex/.test(readFileSync(p, 'utf8'))) continue;
              pages.add('/' + rel.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '/'));
            }
          }
        };
        walk(root);

        const unlisted = [...pages].filter((p) => !listed.has(p)).sort();
        const orphans = [...listed].filter((p) => !pages.has(p)).sort();
        if (unlisted.length || orphans.length) {
          throw new Error(
            [
              'sitemap-guard: dist/sitemap.xml does not match the built pages.',
              ...unlisted.map((p) => `  not in sitemap: ${p}  → add it to getSiteUrls() in src/lib/seo.ts, or render it with noindex`),
              ...orphans.map((p) => `  no page for sitemap URL: ${p}  → remove it from getSiteUrls() in src/lib/seo.ts`),
            ].join('\n'),
          );
        }
        logger.info(`sitemap.xml lists all ${pages.size} indexable pages`);
      },
    },
  };
}
