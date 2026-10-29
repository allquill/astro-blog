import type { APIContext } from 'astro';
import { authorOf, getPosts, getSettings, getTopics } from '../lib/site';
import { postToMarkdown } from '../lib/seo';

// Every post as one Markdown document, so an agent can read the whole blog in a single request.
// Companion to /llms.txt.
export async function GET({ site }: APIContext) {
  const settings = await getSettings();
  const topics = await getTopics();
  const posts = await getPosts();
  const header = `# ${settings.siteName} — full content\n\n> ${settings.description.replace(/\s+/g, ' ').trim()}`;
  // Demote each document's headings one level so the file has a single H1.
  const docs = await Promise.all(posts.map(async (p) => postToMarkdown(p, await authorOf(p), topics, site).replace(/^(#+) /gm, '#$1 ')));
  return new Response([header, ...docs].join('\n\n---\n\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
