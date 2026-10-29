import type { APIContext } from 'astro';
import { abs } from '../lib/seo';

// Everything is public content: all crawlers are welcome, including AI search/answer
// bots and AI training crawlers. The AI bots are listed explicitly so the policy is visible and a
// future default-deny can't catch them by accident.
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', // OpenAI
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User', // Anthropic
  'PerplexityBot', 'Perplexity-User', // Perplexity
  'Google-Extended', // Gemini / Vertex AI
  'Applebot', 'Applebot-Extended', // Apple
  'Bingbot', // Bing, Copilot and ChatGPT search
  'CCBot', // Common Crawl
  'Meta-ExternalAgent', // Meta AI
];

/** Personal pages (links from e-mails) and the API. */
const PRIVATE = ['/subscribe/manage/', '/subscribe/confirm/', '/api/'];

export function GET({ site }: APIContext) {
  const body = [
    'User-agent: *',
    'Allow: /',
    ...PRIVATE.map((p) => `Disallow: ${p}`),
    '',
    ...AI_BOTS.flatMap((bot) => [`User-agent: ${bot}`, 'Allow: /', ...PRIVATE.map((p) => `Disallow: ${p}`), '']),
    `Sitemap: ${abs('/sitemap.xml', site)}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
