// Value lists the content forms accept. They mirror the website (website/src/lib/icons.ts CONTENT_ICONS,
// accents.ts ACCENTS, share.ts SHARE_NETWORKS / SOCIAL_NETWORKS), which renders them: change both together.

export const CONTENT_ICONS = [
  'book', 'code', 'terminal', 'rocket', 'database', 'cloud', 'cpu', 'layers', 'globe', 'pen',
  'lightbulb', 'shield', 'sparkles', 'users', 'camera', 'calendar', 'clock', 'zap',
] as const;
export type ContentIcon = (typeof CONTENT_ICONS)[number];

export const ACCENTS = ['teal', 'sky', 'blue', 'amber', 'orange', 'rose', 'slate'] as const;
export type Accent = (typeof ACCENTS)[number];

/** Share buttons the site can show (Settings → Share buttons). `copy`/`native` are always offered by the site. */
export const SITE_SHARE_NETWORKS = ['x', 'linkedin', 'facebook', 'reddit', 'hackernews', 'bluesky', 'mastodon', 'whatsapp', 'email'] as const;
export const DEFAULT_SHARE = ['x', 'linkedin', 'reddit', 'hackernews', 'bluesky', 'email'];

export const SOCIAL_NETWORKS = ['github', 'x', 'linkedin', 'mastodon', 'bluesky', 'youtube', 'website'] as const;

/** Post, topic, author and page slugs: they become URLs and the join key of stats, feedback and subscribers. */
export const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/;
export const SLUG_MESSAGE = 'Use lowercase letters, digits and dashes (e.g. my-first-post)';

/** "My First Post!" → "my-first-post". */
export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);

/** Slugs that would collide with the site's own routes at the top level (pages are served at /<slug>/). */
export const RESERVED_PAGE_SLUGS = [
  'api', 'blog', 'topics', 'tags', 'authors', 'search', 'subscribe', 'feedback', 'preview', 'media', 'keystatic',
  'feed.json', 'rss.xml', 'sitemap.xml', 'robots.txt', 'llms.txt', 'llms-full.txt', '_astro', 'images',
];
