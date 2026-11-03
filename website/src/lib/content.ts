// The blog's content, from the API (server/src/content/public-content.controller.ts). The site keeps
// one snapshot of everything published in memory and asks the API every CONTENT_POLL_MS whether it
// changed (GET /version, a few bytes). Publishing in the admin therefore shows within seconds, with no
// build. Server-side only: never import this from a <script>.
import { API_INTERNAL_URL, CONTENT_POLL_MS, SITE_URL } from 'astro:env/server';

/** An uploaded image (the API serves it and its resized copies; see media.ts). */
export type MediaImage = { id: string; width: number; height: number; alt: string };

export type ApiPost = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  publishedDate: string;
  updatedDate: string | null;
  author: string;
  topics: string[];
  tags: string[];
  cover: MediaImage | null;
  coverAlt: string;
  series: string;
  featured: boolean;
  canonicalUrl: string | null;
  /** Missing from an API older than the repository-link migration. */
  repositoryUrl?: string | null;
  draft: boolean;
  revision: string;
};
export type ApiTopic = { slug: string; name: string; description: string; icon: string; accent: string; order: number };
export type ApiAuthor = { slug: string; name: string; role: string; bio: string; avatar: MediaImage | null; links: { network: string; url: string }[] };
export type ApiPage = {
  slug: string;
  title: string;
  description: string;
  body: string;
  updatedDate: string | null;
  showInHeader: boolean;
  showInFooter: boolean;
  revision: string;
};
export type ApiSite = {
  siteName: string;
  tagline: string;
  description: string;
  publisher: string;
  email: string;
  social: { network: string; url: string }[];
  nav: { label: string; href: string }[];
  footerLinks: { label: string; href: string }[];
  shareNetworks: string[];
  subscribeTitle: string;
  subscribeText: string;
  postsPerPage: number;
  indexNowKey: string;
};
export type ApiHome = { eyebrow: string; heroTitle: string; heroSubtitle: string; latestTitle: string; topicsTitle: string };
export type Snapshot = {
  version: string;
  posts: ApiPost[];
  topics: ApiTopic[];
  authors: ApiAuthor[];
  pages: ApiPage[];
  site: ApiSite;
  home: ApiHome;
};

/** The API could not be reached and there is no earlier copy (the site answers 503). */
export class ContentUnavailableError extends Error {}

const api = (path: string) => new URL(`/api/public/content${path}`, API_INTERNAL_URL).toString();

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(api(path), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

let current: Snapshot | null = null;
let checkedAt = 0;
let pending: Promise<Snapshot> | null = null;

async function refresh(): Promise<Snapshot> {
  try {
    if (current) {
      const { version } = await getJson<{ version: string }>('/version');
      checkedAt = Date.now();
      if (version === current.version) return current;
    }
    current = await getJson<Snapshot>('/snapshot');
    checkedAt = Date.now();
    return current;
  } catch (e) {
    // Keep serving the last copy; retry on the next request after the poll interval.
    checkedAt = Date.now();
    if (current) {
      console.warn(`content: could not refresh from ${API_INTERNAL_URL} (${(e as Error).message}); serving the last copy`);
      return current;
    }
    throw new ContentUnavailableError(`The blog's content could not be loaded from ${API_INTERNAL_URL}: ${(e as Error).message}`);
  }
}

/** The current snapshot (at most CONTENT_POLL_MS old). Concurrent requests share one refresh. */
export async function snapshot(): Promise<Snapshot> {
  if (current && Date.now() - checkedAt < CONTENT_POLL_MS) return current;
  pending ??= refresh().finally(() => (pending = null));
  return pending;
}

/** A post by a signed preview link from the admin (drafts included), or null when the link is invalid. */
export async function previewPost(slug: string, token: string): Promise<ApiPost | null> {
  const res = await fetch(api(`/preview/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}`), {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  return ((await res.json()) as { post: ApiPost }).post;
}

/** The site's public URL (SITE_URL at runtime), used for every absolute link. */
export const siteUrl = new URL(SITE_URL ?? 'http://localhost:4322');
