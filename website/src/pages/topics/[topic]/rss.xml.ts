import type { APIContext } from 'astro';
import { getSettings, topicsWithPosts, type Post, type Topic } from '../../../lib/site';
import { postsRss } from '../../../lib/rss';

export async function getStaticPaths() {
  return (await topicsWithPosts()).map(({ topic, posts }) => ({ params: { topic: topic.id }, props: { topic, posts } }));
}

export async function GET(context: APIContext<{ topic: Topic; posts: Post[] }>) {
  const { topic, posts } = context.props;
  const settings = await getSettings();
  return postsRss(context, posts, `${topic.data.name} · ${settings.siteName}`, topic.data.description || undefined);
}
