// Shared building blocks for search-engine and AI-agent indexing: the canonical URL list
// (sitemap, llms.txt, IndexNow), Markdown renditions of content, and schema.org JSON-LD.
import { getCollection } from 'astro:content';
import { getAuthors, getPosts, getTags, topicsWithPosts, type Author, type Post, type Settings, type Topic } from './site';

export const abs = (path: string, site: URL | undefined) => new URL(path, site).toString();

export interface SiteUrl {
  path: string;
  /** Last content change; undefined when unknown, in which case the sitemap omits <lastmod>. */
  lastmod?: Date;
}

/** Newest of the given dates, or undefined when none are known. */
export const newest = (dates: (Date | undefined)[]) =>
  dates.filter((d): d is Date => !!d).sort((a, b) => b.valueOf() - a.valueOf())[0];

/** A post's last change: its "Last updated" date, else its publish date. */
export const postModified = (p: Post) => p.data.updatedDate ?? p.data.publishedDate;

/** Page n of a list: /blog/, /blog/page/2/, … */
export const pagePath = (base: string, n: number) => (n <= 1 ? base : `${base}page/${n}/`);
export const pageCount = (items: number, perPage: number) => Math.max(1, Math.ceil(items / perPage));

/**
 * Every indexable page (drafts, 404 and the noindex utility pages excluded). `lastmod` comes only from
 * content dates, never from the build time. The build fails (src/integrations/sitemap-guard.ts) if this
 * list and the built pages disagree.
 */
export async function getSiteUrls(settings: Settings): Promise<SiteUrl[]> {
  const posts = await getPosts();
  const pages = await getCollection('pages');
  const topics = await topicsWithPosts();
  const tags = await getTags();
  const authors = await getAuthors();
  const postDates = posts.map(postModified);
  const pages_ = (base: string, list: Post[]) =>
    Array.from({ length: pageCount(list.length, settings.postsPerPage) }, (_, i) => ({ path: pagePath(base, i + 1), lastmod: newest(list.map(postModified)) }));

  return [
    { path: '/', lastmod: newest(postDates) },
    ...pages_('/blog/', posts),
    ...posts.map((post) => ({ path: `/blog/${post.id}/`, lastmod: postModified(post) })),
    { path: '/topics/', lastmod: newest(postDates) },
    ...topics.flatMap(({ topic, posts }) => pages_(`/topics/${topic.id}/`, posts)),
    ...tags.map((t) => ({ path: `/tags/${t.slug}/`, lastmod: newest(t.posts.map(postModified)) })),
    ...authors.map((a) => ({ path: `/authors/${a.id}/`, lastmod: newest(posts.filter((p) => p.data.author.id === a.id).map(postModified)) })),
    ...pages.map((page) => ({ path: `/${page.id}/`, lastmod: page.data.updatedDate })),
    { path: '/subscribe/' },
    { path: '/feedback/' },
  ];
}

// ---------------------------------------------------------------------------------- Markdown

/**
 * Clean the stored Markdoc body for plain-Markdown consumers: drop Markdoc tags (keeping a video's
 * link), turn images into a text note (their paths are build-internal), make site links absolute.
 */
export function cleanBody(body: string | undefined, site: URL | undefined) {
  return (body ?? '')
    .replace(/\{%\s*video\b([^%]*)%\}/g, (_, attrs: string) => {
      const id = /\bid="([^"]+)"/.exec(attrs)?.[1] ?? '';
      const provider = /provider="(\w+)"/.exec(attrs)?.[1] ?? 'youtube';
      const url = /^https?:/.test(id) ? id : provider === 'vimeo' ? `https://vimeo.com/${id}` : `https://www.youtube.com/watch?v=${id}`;
      return id ? `*(Video: ${url})*` : '';
    })
    .replace(/\{%\s*linkcard\b[^%]*\burl="([^"]+)"[^%]*%\}/g, (_, url: string) => `<${url}>`)
    .replace(/\{%[\s\S]*?%\}/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt) => (alt ? `*(Image: ${alt})*` : ''))
    .replace(/\]\((\/[^)]*)\)/g, (_, path) => `](${abs(path, site)})`)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const postMarkdownPath = (p: Post) => `/blog/${p.id}.md`;

const squash = (lines: string[]) => lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');

export function postToMarkdown(post: Post, author: Author | undefined, topics: Topic[], site: URL | undefined) {
  const d = post.data;
  const names = d.topics.map((r) => topics.find((t) => t.id === r.id)?.data.name).filter(Boolean);
  return squash([
    `# ${d.title}`,
    '',
    d.excerpt ? `> ${d.excerpt}` : '',
    '',
    `**Published:** ${d.publishedDate.toISOString().slice(0, 10)}${author ? ` · **Author:** ${author.data.name}` : ''}  `,
    names.length ? `**Topics:** ${names.join(', ')}  ` : '',
    `**Web page:** ${abs(`/blog/${post.id}/`, site)}`,
    '',
    cleanBody(post.body, site),
    '',
  ]);
}

export const markdownResponse = (text: string) =>
  new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });

// ---------------------------------------------------------------------------------- JSON-LD

export const publisherId = (site: URL | undefined) => `${abs('/', site)}#publisher`;
export const authorUrl = (a: Author, site: URL | undefined) => abs(`/authors/${a.id}/`, site);

/** The person or organisation behind the blog. */
export function publisherLd(settings: Settings, site: URL | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': publisherId(site),
    name: settings.publisher || settings.siteName,
    url: abs('/', site),
    logo: abs('/logo.png', site),
    ...(settings.email ? { email: settings.email } : {}),
    ...(settings.social.length ? { sameAs: settings.social.map((s) => s.url) } : {}),
  };
}

export function websiteLd(settings: Settings, site: URL | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${abs('/', site)}#website`,
    name: settings.siteName,
    url: abs('/', site),
    description: settings.description,
    publisher: { '@id': publisherId(site) },
    inLanguage: 'en',
    potentialAction: { '@type': 'SearchAction', target: `${abs('/search/', site)}?q={query}`, 'query-input': 'required name=query' },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[], site: URL | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path, site) })),
  };
}

export function personLd(a: Author, site: URL | undefined) {
  return {
    '@type': 'Person',
    name: a.data.name,
    url: authorUrl(a, site),
    ...(a.data.role ? { jobTitle: a.data.role } : {}),
    ...(a.data.links.length ? { sameAs: a.data.links.map((l) => l.url) } : {}),
  };
}

export function blogPostingLd(post: Post, author: Author, topics: Topic[], site: URL | undefined, image?: string, video?: string[]) {
  const d = post.data;
  const url = abs(`/blog/${post.id}/`, site);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: d.title,
    description: d.excerpt,
    url,
    mainEntityOfPage: url,
    datePublished: d.publishedDate.toISOString(),
    dateModified: postModified(post).toISOString(),
    author: personLd(author, site),
    publisher: { '@id': publisherId(site) },
    ...(image ? { image } : {}),
    ...(d.tags.length ? { keywords: d.tags.join(', ') } : {}),
    ...(topics.length ? { articleSection: topics.map((t) => t.data.name) } : {}),
    ...(video?.length ? { video: video.map((embedUrl) => ({ '@type': 'VideoObject', embedUrl, name: d.title, thumbnailUrl: image, uploadDate: d.publishedDate.toISOString() })) } : {}),
    inLanguage: 'en',
  };
}

/** YouTube / Vimeo embeds in a body, for VideoObject structured data. */
export function videoEmbeds(body: string | undefined) {
  return [...(body ?? '').matchAll(/\{%\s*video\b([^%]*)%\}/g)].flatMap((m) => {
    const provider = /provider="(\w+)"/.exec(m[1]!)?.[1] ?? 'youtube';
    const id = /\bid="([^"]+)"/.exec(m[1]!)?.[1];
    if (!id || provider === 'file') return [];
    const clean = provider === 'youtube' ? (/([\w-]{11})(?!.*[\w-]{11})/.exec(id)?.[1] ?? id) : (/(\d+)/.exec(id)?.[1] ?? id);
    return [provider === 'youtube' ? `https://www.youtube-nocookie.com/embed/${clean}` : `https://player.vimeo.com/video/${clean}`];
  });
}

export function blogLd(settings: Settings, posts: Post[], site: URL | undefined, path = '/blog/', name?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${abs(path, site)}#blog`,
    name: name ?? settings.siteName,
    url: abs(path, site),
    publisher: { '@id': publisherId(site) },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.data.title,
      url: abs(`/blog/${p.id}/`, site),
      datePublished: p.data.publishedDate.toISOString(),
    })),
  };
}
