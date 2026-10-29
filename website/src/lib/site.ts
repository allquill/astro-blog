import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { ACCENTS, type AccentName } from './accents';

export type Post = CollectionEntry<'posts'>;
export type Topic = CollectionEntry<'topics'>;
export type Author = CollectionEntry<'authors'>;
export type Settings = CollectionEntry<'settings'>['data'];

export async function getSettings(): Promise<Settings> {
  const entry = await getEntry('settings', 'default');
  if (!entry) throw new Error('src/content/settings.yaml is missing');
  return entry.data;
}

export async function getHome() {
  const entry = await getEntry('home', 'default');
  if (!entry) throw new Error('src/content/home.yaml is missing');
  return entry.data;
}

/**
 * Posts, newest first. Drafts are visible under `astro dev` (so authors can preview them) and left
 * out of production builds.
 */
export async function getPosts(filter: { topic?: string; tag?: string; author?: string } = {}): Promise<Post[]> {
  const posts = await getCollection('posts', (p) => !(import.meta.env.PROD && p.data.draft));
  return posts
    .filter((p) => !filter.topic || p.data.topics.some((r) => r.id === filter.topic))
    .filter((p) => !filter.tag || p.data.tags.map(tagSlug).includes(filter.tag))
    .filter((p) => !filter.author || p.data.author.id === filter.author)
    .sort((a, b) => b.data.publishedDate.valueOf() - a.data.publishedDate.valueOf());
}

export async function getTopics(): Promise<Topic[]> {
  return (await getCollection('topics')).sort((a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name));
}

/** Topics that have at least one (published) post, with those posts. */
export async function topicsWithPosts() {
  const [topics, posts] = await Promise.all([getTopics(), getPosts()]);
  return topics
    .map((topic) => ({ topic, posts: posts.filter((p) => p.data.topics.some((r) => r.id === topic.id)) }))
    .filter((x) => x.posts.length > 0);
}

export async function getAuthors(): Promise<Author[]> {
  return (await getCollection('authors')).sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export async function authorOf(post: Post): Promise<Author> {
  const a = await getEntry(post.data.author);
  if (!a) throw new Error(`Post ${post.id}: unknown author ${post.data.author.id}`);
  return a;
}

/** The post's topics, in the order the author listed them. */
export function topicsOf(post: Post, topics: Topic[]) {
  return post.data.topics.map((r) => topics.find((t) => t.id === r.id)).filter((t): t is Topic => !!t);
}

/** "Web Performance" → "web-performance" (tag URLs). */
export const tagSlug = (tag: string) =>
  tag.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-');

/** Every tag used by a published post, with its posts, most used first. */
export async function getTags() {
  const m = new Map<string, { slug: string; name: string; posts: Post[] }>();
  for (const p of await getPosts()) {
    for (const name of p.data.tags) {
      const slug = tagSlug(name);
      if (!slug) continue;
      const t = m.get(slug) ?? { slug, name, posts: [] };
      t.posts.push(p);
      m.set(slug, t);
    }
  }
  return [...m.values()].sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name));
}

/** Other posts of the same series, oldest first (including this one). */
export async function seriesOf(post: Post) {
  if (!post.data.series) return [];
  return (await getPosts()).filter((p) => p.data.series === post.data.series).reverse();
}

export function accentOf(name: string) {
  return ACCENTS[(name in ACCENTS ? name : 'teal') as AccentName];
}

/** Rough reading time in minutes (~220 words per minute; code counts at half speed), at least 1. */
export function readingTime(body: string | undefined) {
  const text = body ?? '';
  const code = [...text.matchAll(/```[\s\S]*?```/g)].map((m) => m[0]).join(' ');
  const prose = text.replace(/```[\s\S]*?```/g, ' ').replace(/\{%[^%]*%\}|<[^>]+>|[#>*_`\[\]()!-]/g, ' ');
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil((words(prose) + words(code) / 2) / 220));
}

const dateFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
export const formatDate = (date: Date) => dateFormat.format(date);
