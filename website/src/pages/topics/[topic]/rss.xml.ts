import type { APIContext } from 'astro';
import { getSettings, topicsWithPosts } from '../../../lib/site';
import { postsRss } from '../../../lib/rss';

export async function GET(context: APIContext) {
  const found = (await topicsWithPosts()).find((t) => t.topic.id === context.params.topic);
  if (!found) return new Response(null, { status: 404 });
  const settings = await getSettings();
  return postsRss(context, found.posts, `${found.topic.data.name} · ${settings.siteName}`, found.topic.data.description || undefined);
}
