import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { AppConfig } from '../config/app-config.service';

/** One post as the website's /feed.json describes it (JSON Feed 1.1 plus a `_blog` extension). */
export type FeedPost = {
  slug: string;
  url: string;
  title: string;
  summary: string;
  image: string | null;
  publishedAt: string;
  author: string;
  topics: string[];
  tags: string[];
};
export type FeedTopic = { slug: string; name: string; description: string };

type JsonFeed = {
  title?: string;
  items?: {
    id: string;
    url: string;
    title: string;
    summary?: string;
    image?: string;
    date_published: string;
    tags?: string[];
    authors?: { name: string }[];
    _blog?: { slug?: string; topics?: string[] };
  }[];
  _blog?: { topics?: FeedTopic[] };
};

const TTL_MS = 5 * 60 * 1000;
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

/**
 * The posts and topics the website was built with, read from its /feed.json (SITE_FEED_URL) and cached
 * for a few minutes. Content lives in Keystatic files, not in this database: this is how the API knows
 * which slugs are real (so counters can't be created for arbitrary ones) and what a digest links to.
 */
@Injectable()
export class SiteFeedService {
  private readonly logger = new Logger('SiteFeed');
  private posts: FeedPost[] | null = null;
  private topics: FeedTopic[] = [];
  private loadedAt = 0;
  private pending: Promise<void> | null = null;

  constructor(private readonly config: AppConfig) {}

  /** Last successful read, refreshed in the background once it is older than TTL_MS. */
  private async ensure(force = false) {
    const stale = Date.now() - this.loadedAt > TTL_MS;
    if (!force && this.posts && !stale) return;
    this.pending ??= this.load().finally(() => (this.pending = null));
    // With a (stale) copy in hand, don't make the request wait on the website.
    if (!this.posts || force) await this.pending;
  }

  private async load() {
    const url = this.config.get('SITE_FEED_URL');
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { accept: 'application/feed+json, application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const feed = (await res.json()) as JsonFeed;
      this.posts = (feed.items ?? []).map((i) => ({
        slug: i._blog?.slug ?? i.id,
        url: i.url,
        title: i.title,
        summary: i.summary ?? '',
        image: i.image ?? null,
        publishedAt: i.date_published,
        author: i.authors?.[0]?.name ?? '',
        topics: i._blog?.topics ?? [],
        tags: i.tags ?? [],
      }));
      this.topics = feed._blog?.topics ?? [];
      this.loadedAt = Date.now();
    } catch (e) {
      // Keep serving the last copy; try again on the next request after a short back-off.
      this.loadedAt = Date.now() - TTL_MS + 30_000;
      this.logger.warn(`Could not read the site feed ${url} (${(e as Error).message})`);
    }
  }

  get url() {
    return this.config.get('SITE_FEED_URL');
  }

  /** True while the feed has never been read (the website isn't up yet, e.g. right after `pnpm run dev`). */
  get unavailable() {
    return this.posts === null;
  }

  async allPosts(force = false) {
    await this.ensure(force);
    return this.posts ?? [];
  }

  async allTopics() {
    await this.ensure();
    return this.topics;
  }

  async post(slug: string) {
    return (await this.allPosts()).find((p) => p.slug === slug) ?? null;
  }

  /**
   * Whether engagement may be recorded for a slug. With no feed at all, a well-formed slug is accepted
   * (logged above) so likes still work in development before the site has been served once.
   */
  async isKnown(slug: string) {
    if (!SLUG.test(slug)) return false;
    const posts = await this.allPosts();
    return this.unavailable ? true : posts.some((p) => p.slug === slug);
  }
}

@Global()
@Module({ providers: [SiteFeedService], exports: [SiteFeedService] })
export class SiteFeedModule {}
