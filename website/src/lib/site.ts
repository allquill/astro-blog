import { ACCENTS, type AccentName } from './accents';
import { snapshot, type ApiAuthor, type ApiPage, type ApiPost, type ApiTopic, type MediaImage } from './content';
import type { IconName } from './icons';
import type { ShareNetwork, SocialNetwork } from './share';

// The blog's content as pages and components use it: the API's snapshot (lib/content.ts) in the
// `{ id, data }` shape the site was written against when content was Astro collections, so references
// are still `{ id }` (e.g. post.data.author.id).

type Ref = { id: string };

export type Post = {
  id: string;
  /** Markdoc source. */
  body: string;
  /** Changes on every edit (cache key for the rendered body). */
  revision: string;
  data: {
    title: string;
    excerpt: string;
    publishedDate: Date;
    updatedDate?: Date;
    author: Ref;
    topics: Ref[];
    tags: string[];
    cover: MediaImage | null;
    coverAlt: string;
    series: string;
    featured: boolean;
    /** Only true in a preview from the admin. */
    draft: boolean;
    canonicalUrl: string | null;
    /** Link to the code behind the post, shown under the title. */
    repositoryUrl: string | null;
    /** Overrides the title in <title> and share cards (the page heading keeps `title`). */
    seoTitle: string;
    /** Overrides the excerpt as the meta and share description. */
    seoDescription: string;
    /** Kept out of search engines and the sitemap. */
    noindex: boolean;
  };
};
export type Topic = { id: string; data: { name: string; description: string; icon: IconName; accent: AccentName; order: number } };
export type Author = { id: string; data: { name: string; role: string; bio: string; avatar: MediaImage | null; links: { network: SocialNetwork; url: string }[] } };
export type Page = {
  id: string;
  body: string;
  revision: string;
  data: { title: string; description: string; updatedDate?: Date; showInHeader: boolean; showInFooter: boolean };
};
export type Settings = Omit<Awaited<ReturnType<typeof snapshot>>['site'], 'shareNetworks' | 'social'> & {
  shareNetworks: ShareNetwork[];
  social: { network: SocialNetwork; url: string }[];
};

const date = (v: string | null) => (v ? new Date(v) : undefined);

export const toPost = (p: ApiPost): Post => ({
  id: p.slug,
  body: p.body,
  revision: p.revision,
  data: {
    title: p.title,
    excerpt: p.excerpt,
    publishedDate: new Date(p.publishedDate),
    updatedDate: date(p.updatedDate),
    author: { id: p.author },
    topics: p.topics.map((id) => ({ id })),
    tags: p.tags,
    cover: p.cover,
    coverAlt: p.coverAlt,
    series: p.series,
    featured: p.featured,
    draft: p.draft,
    canonicalUrl: p.canonicalUrl,
    repositoryUrl: p.repositoryUrl ?? null,
    seoTitle: p.seoTitle ?? '',
    seoDescription: p.seoDescription ?? '',
    noindex: p.noindex ?? false,
  },
});
const toTopic = (t: ApiTopic): Topic => ({
  id: t.slug,
  data: { name: t.name, description: t.description, icon: t.icon as IconName, accent: (t.accent in ACCENTS ? t.accent : 'teal') as AccentName, order: t.order },
});
const toAuthor = (a: ApiAuthor): Author => ({
  id: a.slug,
  data: { name: a.name, role: a.role, bio: a.bio, avatar: a.avatar, links: a.links as Author['data']['links'] },
});
const toPage = (p: ApiPage): Page => ({
  id: p.slug,
  body: p.body,
  revision: p.revision,
  data: { title: p.title, description: p.description, updatedDate: date(p.updatedDate), showInHeader: p.showInHeader, showInFooter: p.showInFooter },
});

// Converted once per snapshot, not on every call.
let cached: { version: string; posts: Post[]; topics: Topic[]; authors: Author[]; pages: Page[] } | null = null;
async function content() {
  const s = await snapshot();
  if (cached?.version !== s.version) {
    cached = { version: s.version, posts: s.posts.map(toPost), topics: s.topics.map(toTopic), authors: s.authors.map(toAuthor), pages: s.pages.map(toPage) };
  }
  return cached;
}

export async function getSettings(): Promise<Settings> {
  return (await snapshot()).site as Settings;
}

export async function getHome() {
  return (await snapshot()).home;
}

/** Published posts, newest first (the API leaves drafts and future-dated posts out). */
export async function getPosts(filter: { topic?: string; tag?: string; author?: string } = {}): Promise<Post[]> {
  const { posts } = await content();
  return posts
    .filter((p) => !filter.topic || p.data.topics.some((r) => r.id === filter.topic))
    .filter((p) => !filter.tag || p.data.tags.map(tagSlug).includes(filter.tag))
    .filter((p) => !filter.author || p.data.author.id === filter.author);
}

export async function getPost(slug: string) {
  return (await content()).posts.find((p) => p.id === slug);
}

export async function getTopics(): Promise<Topic[]> {
  return (await content()).topics;
}

export async function getPages(): Promise<Page[]> {
  return (await content()).pages;
}

export async function getPage(slug: string) {
  return (await content()).pages.find((p) => p.id === slug);
}

/** Topics that have at least one (published) post, with those posts. */
export async function topicsWithPosts() {
  const [topics, posts] = await Promise.all([getTopics(), getPosts()]);
  return topics
    .map((topic) => ({ topic, posts: posts.filter((p) => p.data.topics.some((r) => r.id === topic.id)) }))
    .filter((x) => x.posts.length > 0);
}

export async function getAuthors(): Promise<Author[]> {
  return (await content()).authors;
}

const unknownAuthor = (id: string): Author => ({ id, data: { name: id || 'Unknown author', role: '', bio: '', avatar: null, links: [] } });

/** The post's author (a placeholder if the author was removed, so the page still renders). */
export async function authorOf(post: Post): Promise<Author> {
  return (await content()).authors.find((a) => a.id === post.data.author.id) ?? unknownAuthor(post.data.author.id);
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
