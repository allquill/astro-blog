import { defineMiddleware } from 'astro:middleware';
import { ContentUnavailableError } from './lib/content';

// Every page is rendered on request from the API's content (lib/content.ts).
//  - Caching: browsers revalidate every time; nginx in front (website/nginx.conf) keeps a page for
//    EDGE_CACHE_SECONDS (X-Accel-Expires, which it strips), so a publish shows within seconds.
//    A page that sets its own Cache-Control (the preview) is never cached.
//  - Before the API has answered once, the site says so with a 503 instead of an error page.
//  - Every page URL ends in a slash: /blog/x answers 301 → /blog/x/, so each page has one URL (and
//    the canonical in BaseLayout matches it). Files (/sitemap.xml, /blog/x.md, …) are left alone.

const EDGE_CACHE_SECONDS = 10;

const UNAVAILABLE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Back in a moment</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#fff;color:#0f172a}@media (prefers-color-scheme:dark){body{background:#06100f;color:#e2e8f0}}main{max-width:28rem;padding:2rem}</style>
</head><body><main><h1>Back in a moment</h1><p>The blog is starting up or briefly unavailable. Please try again in a minute.</p></main></body></html>`;

/** The slash-terminated form of a page path, or null when the path is already canonical or a file. */
function withSlash(path: string) {
  if (path.endsWith('/') || path.startsWith('/api/') || path.startsWith('/_')) return null;
  const last = path.slice(path.lastIndexOf('/') + 1);
  return last.includes('.') ? null : `${path}/`;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  if (request.method === 'GET' || request.method === 'HEAD') {
    const target = withSlash(url.pathname);
    if (target) return new Response(null, { status: 301, headers: { Location: target + url.search, 'Cache-Control': 'public, max-age=3600' } });
  }
  let response: Response;
  try {
    response = await next();
  } catch (e) {
    if (!(e instanceof ContentUnavailableError)) throw e;
    console.error(e.message);
    return new Response(UNAVAILABLE, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '30', 'Cache-Control': 'no-store', 'X-Accel-Expires': '0' },
    });
  }
  if (!response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    if (response.status === 200 || response.status === 404) response.headers.set('X-Accel-Expires', String(EDGE_CACHE_SECONDS));
  } else if (/no-store|private/.test(response.headers.get('Cache-Control') ?? '')) {
    response.headers.set('X-Accel-Expires', '0');
  }
  return response;
});
