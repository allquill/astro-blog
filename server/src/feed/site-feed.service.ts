import { Global, Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { In, LessThanOrEqual, type Repository } from 'typeorm';
import { AppConfig } from '../config/app-config.service';
import { Author, Post, Topic } from '../content/content.entities';
import { mediaPath } from '../content/media.service';

/** One published post, as engagement, feedback, the dashboard and new-post e-mails see it. */
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

const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

/**
 * The published posts and the topics, read from the content tables (content/). It keeps the shape it
 * had when it read the website's /feed.json, so its users didn't change. Post links are
 * PUBLIC_SITE_URL + /blog/<slug>/, and images are absolute JPEG URLs (e-mail clients and feed readers).
 */
@Injectable()
export class SiteFeedService {
  constructor(
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Topic) private readonly topics: Repository<Topic>,
    @InjectRepository(Author) private readonly authors: Repository<Author>,
    private readonly config: AppConfig,
  ) {}

  private abs(path: string) {
    return new URL(path, this.config.get('PUBLIC_SITE_URL')).toString();
  }

  /** The site's public JSON feed (for display; the API no longer reads it). */
  get url() {
    return this.abs('/feed.json');
  }

  /** Content is in this database, so there is always a feed. Kept for the admin's dashboard contract. */
  get unavailable() {
    return false;
  }

  private visible() {
    return { status: 'published' as const, publishedDate: LessThanOrEqual(Date.now()) };
  }

  private async toFeed(rows: Post[]): Promise<FeedPost[]> {
    const authorSlugs = [...new Set(rows.map((r) => r.authorSlug).filter(Boolean))];
    const names = new Map(
      (authorSlugs.length ? await this.authors.find({ where: { slug: In(authorSlugs) }, select: { slug: true, name: true } }) : []).map((a) => [a.slug, a.name]),
    );
    return rows.map((p) => ({
      slug: p.slug,
      url: this.abs(`/blog/${p.slug}/`),
      title: p.title,
      summary: p.excerpt,
      image: p.coverId ? this.abs(mediaPath(p.coverId, 1280, 'jpg')) : null,
      publishedAt: new Date(p.publishedDate ?? p.createdAt.getTime()).toISOString(),
      author: names.get(p.authorSlug) ?? '',
      topics: p.topics,
      tags: p.tags,
    }));
  }

  /** Published posts whose date has come, newest first. (`force` is kept for callers; there is no cache.) */
  async allPosts(_force = false): Promise<FeedPost[]> {
    const rows = await this.posts.find({
      where: this.visible(),
      order: { publishedDate: 'DESC', id: 'DESC' },
      select: { id: true, slug: true, title: true, excerpt: true, coverId: true, publishedDate: true, createdAt: true, authorSlug: true, topics: true, tags: true },
    });
    return this.toFeed(rows);
  }

  async allTopics(): Promise<FeedTopic[]> {
    const rows = await this.topics.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
    return rows.map((t) => ({ slug: t.slug, name: t.name, description: t.description }));
  }

  async post(slug: string): Promise<FeedPost | null> {
    if (!SLUG.test(slug)) return null;
    const p = await this.posts.findOne({ where: { slug, ...this.visible() } });
    return p ? (await this.toFeed([p]))[0]! : null;
  }

  /** Whether engagement may be recorded for a slug: a published post. */
  async isKnown(slug: string) {
    return SLUG.test(slug) && (await this.posts.existsBy({ slug, ...this.visible() }));
  }
}

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Post, Topic, Author])],
  providers: [SiteFeedService],
  exports: [SiteFeedService],
})
export class SiteFeedModule {}
