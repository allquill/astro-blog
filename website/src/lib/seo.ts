// Shared building blocks for search-engine and AI-agent indexing: the canonical URL list
// (sitemap, llms.txt, IndexNow), Markdown renditions of content, and schema.org JSON-LD.
import { siteUrl } from './content';
import { fitWidth, mediaUrl } from './media';
import { getAuthors, getPages, getPosts, getTags, topicsWithPosts, type Author, type Post, type Settings, type Topic } from './site';

export const abs = (path: string, site: URL | undefined) => new URL(path, site).toString();

export interface SiteUrl {
  path: string;
  /** Last content change; undefined when unknown, in which case the sitemap omits <lastmod>. */
  lastmod?: Date;
  /** Which sub-sitemap lists it (/sitemap-posts.xml or /sitemap-pages.xml). */
  kind: 'post' | 'page';
  /** Images on the page (site-relative or absolute), for the image sitemap extension. */
  images?: { loc: string; title?: string }[];
}

/**
 * Whether a post belongs in the sitemap and other "every page" lists: not hidden from search, and not
 * a copy of something first published elsewhere (its canonical URL points to another site).
 */
export function isIndexable(post: Post, site: URL | undefined = siteUrl) {
  if (post.data.noindex || post.data.draft) return false;
  const canonical = post.data.canonicalUrl;
  if (!canonical) return true;
  try {
    return new URL(canonical).toString() === abs(`/blog/${post.id}/`, site);
  } catch {
    return true;
  }
}

const MEDIA_IN_BODY = /\/api\/public\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g;

/** A post's cover and the uploaded images in its body. */
export function postImages(post: Post): { loc: string; title?: string }[] {
  const images: { loc: string; title?: string }[] = [];
  const { cover, coverAlt, title } = post.data;
  if (cover) images.push({ loc: mediaUrl(cover.id, fitWidth(cover, 1280), 'jpg'), title: coverAlt || title });
  const seen = new Set(cover ? [cover.id] : []);
  for (const m of (post.body ?? '').matchAll(MEDIA_IN_BODY)) {
    if (seen.has(m[1]!)) continue;
    seen.add(m[1]!);
    images.push({ loc: mediaUrl(m[1]!, 1280, 'jpg') });
  }
  return images;
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
 * content dates. A new hand-written page under src/pages/ must be added here (or render with noindex).
 */
export async function getSiteUrls(settings: Settings): Promise<SiteUrl[]> {
  const indexable = (list: Post[]) => list.filter((p) => isIndexable(p));
  const posts = indexable(await getPosts());
  const pages = await getPages();
  const topics = await topicsWithPosts();
  const tags = await getTags();
  const authors = await getAuthors();
  const postDates = posts.map(postModified);
  const pages_ = (base: string, list: Post[]) =>
    // Page counts follow what the list pages show (every published post); dates only indexable ones.
    Array.from({ length: pageCount(list.length, settings.postsPerPage) }, (_, i): SiteUrl => ({
      path: pagePath(base, i + 1),
      lastmod: newest(indexable(list).map(postModified)),
      kind: 'page',
    }));
  const all = await getPosts();

  return [
    { path: '/', lastmod: newest(postDates), kind: 'page' },
    ...pages_('/blog/', all),
    ...posts.map((post): SiteUrl => ({ path: `/blog/${post.id}/`, lastmod: postModified(post), kind: 'post', images: postImages(post) })),
    { path: '/topics/', lastmod: newest(postDates), kind: 'page' },
    ...topics.flatMap(({ topic, posts }) => pages_(`/topics/${topic.id}/`, posts)),
    ...tags.map((t): SiteUrl => ({ path: `/tags/${t.slug}/`, lastmod: newest(indexable(t.posts).map(postModified)), kind: 'page' })),
    ...authors.map((a): SiteUrl => ({ path: `/authors/${a.id}/`, lastmod: newest(posts.filter((p) => p.data.author.id === a.id).map(postModified)), kind: 'page' })),
    ...pages.map((page): SiteUrl => ({ path: `/${page.id}/`, lastmod: page.data.updatedDate, kind: 'page' })),
    { path: '/subscribe/', kind: 'page' },
    { path: '/feedback/', kind: 'page' },
  ];
}

// ---------------------------------------------------------------------------------- Sitemaps

const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const day = (d: Date) => d.toISOString().slice(0, 10);
const xmlResponse = (body: string) => new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });

/** A <urlset> sitemap (with the image extension) of the given URLs. */
export function urlsetResponse(urls: SiteUrl[], site: URL | undefined) {
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls.map((u) =>
      [
        `  <url><loc>${xmlEsc(abs(u.path, site))}</loc>`,
        u.lastmod ? `<lastmod>${day(u.lastmod)}</lastmod>` : '',
        ...(u.images ?? []).map(
          (img) => `<image:image><image:loc>${xmlEsc(abs(img.loc, site))}</image:loc>${img.title ? `<image:title>${xmlEsc(img.title)}</image:title>` : ''}</image:image>`,
        ),
        '</url>',
      ].join(''),
    ),
    '</urlset>',
    '',
  ].join('\n');
  return xmlResponse(body);
}

/** The sub-sitemaps listed by /sitemap-index.xml. */
export const SITEMAPS = { posts: '/sitemap-posts.xml', pages: '/sitemap-pages.xml' } as const;

/** A <sitemapindex> pointing at the sub-sitemaps, each dated by its newest entry. */
export function sitemapIndexResponse(urls: SiteUrl[], site: URL | undefined) {
  const entry = (path: string, kind: SiteUrl['kind']) => {
    const lastmod = newest(urls.filter((u) => u.kind === kind).map((u) => u.lastmod));
    return `  <sitemap><loc>${xmlEsc(abs(path, site))}</loc>${lastmod ? `<lastmod>${day(lastmod)}</lastmod>` : ''}</sitemap>`;
  };
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entry(SITEMAPS.posts, 'post'),
    entry(SITEMAPS.pages, 'page'),
    '</sitemapindex>',
    '',
  ].join('\n');
  return xmlResponse(body);
}

// ---------------------------------------------------------------------------------- Markdown

/**
 * Clean the stored Markdoc body for plain-Markdown consumers: drop Markdoc tags (keeping a video's
 * link), turn images into a text note, make site links absolute.
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

/**
 * The share card the API draws for a post without a cover (server/src/content/og-image.service.ts).
 * The file name is a hash of everything on the card, so caches pick up a change to any of it.
 */
export function ogCardPath(p: Post, settings: Settings, authorName: string) {
  const input = [p.revision, p.data.seoTitle || p.data.title, settings.siteName, settings.brandColor ?? '', authorName].join('\u0000');
  let h = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 0x01000193);
  return `/api/public/og/${encodeURIComponent(p.id)}/${(h >>> 0).toString(36)}.png`;
}

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
    description: d.seoDescription || d.excerpt,
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
