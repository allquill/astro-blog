import type { APIContext } from 'astro';
import { getPosts } from '../lib/site';
import { postsRss } from '../lib/rss';

export async function GET(context: APIContext) {
  return postsRss(context, await getPosts());
}
