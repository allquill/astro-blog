import type { APIContext } from 'astro';
import { getImage } from 'astro:assets';
import { authorOf, getPosts, getSettings, getTopics } from '../lib/site';
import { abs } from '../lib/seo';

// JSON Feed 1.1 (https://jsonfeed.org) for feed readers. The API reads it too (SITE_FEED_URL): it is
// how the server learns which post slugs and topics exist and what a new-post e-mail links to. The
// `_blog` extension carries the slug and topic ids the API needs; keep it in step with
// server/src/feed/site-feed.service.ts.
export async function GET({ site }: APIContext) {
  const settings = await getSettings();
  const topics = await getTopics();
  const posts = await getPosts();
  const items = await Promise.all(
    posts.map(async (p) => {
      const author = await authorOf(p);
      const image = p.data.cover ? abs((await getImage({ src: p.data.cover, width: 1200, format: 'jpeg', quality: 80 })).src, site) : undefined;
      return {
        id: abs(`/blog/${p.id}/`, site),
        url: abs(`/blog/${p.id}/`, site),
        title: p.data.title,
        summary: p.data.excerpt,
        ...(image ? { image } : {}),
        date_published: p.data.publishedDate.toISOString(),
        ...(p.data.updatedDate ? { date_modified: p.data.updatedDate.toISOString() } : {}),
        authors: [{ name: author.data.name, url: abs(`/authors/${author.id}/`, site) }],
        tags: p.data.tags,
        _blog: { slug: p.id, topics: p.data.topics.map((r) => r.id) },
      };
    }),
  );
  const body = {
    version: 'https://jsonfeed.org/version/1.1',
    title: settings.siteName,
    description: settings.description,
    home_page_url: abs('/', site),
    feed_url: abs('/feed.json', site),
    language: 'en',
    items,
    _blog: { topics: topics.map((t) => ({ slug: t.id, name: t.data.name, description: t.data.description })) },
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/feed+json; charset=utf-8' } });
}
