import type { APIContext } from 'astro';
import { authorOf, getPosts, getTopics, type Post } from '../../lib/site';
import { markdownResponse, postToMarkdown } from '../../lib/seo';

// Plain-Markdown twin of /blog/<slug>/ for AI agents (linked from llms.txt and the page head).
export async function getStaticPaths() {
  return (await getPosts()).map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export async function GET({ props, site }: APIContext<{ post: Post }>) {
  return markdownResponse(postToMarkdown(props.post, await authorOf(props.post), await getTopics(), site));
}
