import type { APIContext } from 'astro';
import { siteUrl } from '../../lib/content';
import { authorOf, getPost, getTopics } from '../../lib/site';
import { markdownResponse, postToMarkdown } from '../../lib/seo';

// Plain-Markdown twin of /blog/<slug>/ for AI agents (linked from llms.txt and the page head).
export async function GET({ params }: APIContext) {
  const post = await getPost(params.slug ?? '');
  if (!post) return new Response(null, { status: 404 });
  return markdownResponse(postToMarkdown(post, await authorOf(post), await getTopics(), siteUrl));
}
