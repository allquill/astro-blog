import type { APIContext } from 'astro';
import { getPosts, getTopics, topicsOf } from '../lib/site';
import { cleanBody } from '../lib/seo';

// The client-side search index for /search/: titles, excerpts, topics, tags and the start of each body.
export async function GET({ site }: APIContext) {
  const topics = await getTopics();
  const posts = (await getPosts()).map((p) => ({
    slug: p.id,
    title: p.data.title,
    excerpt: p.data.excerpt,
    date: p.data.publishedDate.toISOString().slice(0, 10),
    topics: topicsOf(p, topics).map((t) => t.data.name),
    tags: p.data.tags,
    text: cleanBody(p.body, site).replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`[\]()]/g, ' ').replace(/\s+/g, ' ').slice(0, 4000),
  }));
  return new Response(JSON.stringify(posts), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
