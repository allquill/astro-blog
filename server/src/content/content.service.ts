import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, LessThanOrEqual, type Repository } from 'typeorm';
import { AppConfig } from '../config/app-config.service';
import { PostStat } from '../engagement/engagement.entities';
import { FeedbackService } from '../feedback/feedback.service';
import { RESERVED_PAGE_SLUGS, slugify } from './content.constants';
import type {
  AuthorDto, AuthorInputDto, ContentSnapshotDto, PageDto, PageInputDto, PostDetailDto, PostInputDto, PostListDto, PostListQuery, PostSummaryDto,
  PublicAuthorDto, PublicImageDto, PublicPageDto, PublicPostDto, PublicTopicDto, TopicDto, TopicInputDto,
} from './content.dto';
import { Author, Media, Page, Post, Topic } from './content.entities';
import { validateBody } from './markdoc-schema';
import { MediaService } from './media.service';
import { SiteContentService } from './site-content.service';

const PREVIEW_TTL_MS = 2 * 60 * 60 * 1000;

/** "2026-11-03" or an ISO date-time → epoch ms (dates are UTC midnight). */
const toMs = (v: string | null | undefined) => (v ? Date.parse(v) : null);
const toIso = (v: number | null) => (v == null ? null : new Date(v).toISOString());

/** A post's status as the admin shows it. */
const statusOf = (p: Post, now = Date.now()) =>
  p.status === 'published' && (p.publishedDate ?? 0) > now ? 'scheduled' : p.status;

/**
 * Posts, topics, authors and pages: the admin's CRUD, the rules that keep slugs stable, and the
 * published snapshot the website renders from. Every write bumps `version`, which the website polls
 * to know when to fetch a new snapshot.
 */
@Injectable()
export class ContentService {
  private readonly boot = Date.now().toString(36);
  private counter = 0;

  constructor(
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Topic) private readonly topics: Repository<Topic>,
    @InjectRepository(Author) private readonly authors: Repository<Author>,
    @InjectRepository(Page) private readonly pages: Repository<Page>,
    @InjectRepository(PostStat) private readonly stats: Repository<PostStat>,
    private readonly media: MediaService,
    private readonly site: SiteContentService,
    private readonly feedback: FeedbackService,
    private readonly config: AppConfig,
  ) {}

  /** Marks the published content as changed. */
  touch() {
    this.counter++;
  }

  postUrl(slug: string) {
    return new URL(`/blog/${slug}/`, this.config.get('PUBLIC_SITE_URL')).toString();
  }

  // ---------------------------------------------------------------------------------- posts

  async listPosts(q: PostListQuery): Promise<PostListDto> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;
    const now = Date.now();
    const qb = this.posts.createQueryBuilder('p').select([
      'p.id', 'p.slug', 'p.title', 'p.status', 'p.publishedDate', 'p.firstPublishedAt', 'p.authorSlug', 'p.topics', 'p.tags',
      'p.coverId', 'p.featured', 'p.updatedAt', 'p.updatedBy',
    ]);
    if (q.q) {
      const like = `%${q.q.toLowerCase()}%`;
      qb.andWhere(new Brackets((w) => w.where('LOWER(p.title) LIKE :like', { like }).orWhere('LOWER(p.slug) LIKE :like', { like })));
    }
    if (q.status === 'draft') qb.andWhere("p.status = 'draft'");
    if (q.status === 'published') qb.andWhere("p.status = 'published' AND p.publishedDate <= :now", { now });
    if (q.status === 'scheduled') qb.andWhere("p.status = 'published' AND p.publishedDate > :now", { now });
    // Drafts (no date yet) first, then newest.
    qb.orderBy('CASE WHEN p.publishedDate IS NULL THEN 0 ELSE 1 END', 'ASC').addOrderBy('p.publishedDate', 'DESC').addOrderBy('p.id', 'DESC');
    const [rows, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();

    const slugs = rows.map((r) => r.slug);
    const [stats, votes] = await Promise.all([
      slugs.length ? this.stats.findBy({ slug: In(slugs) }) : Promise.resolve([]),
      this.feedback.perPost(),
    ]);
    const bySlug = new Map(stats.map((s) => [s.slug, s]));
    const data: PostSummaryDto[] = rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      status: statusOf(p, now),
      publishedDate: p.publishedDate,
      author: p.authorSlug,
      topics: p.topics,
      tags: p.tags,
      coverId: p.coverId,
      featured: p.featured,
      slugLocked: p.firstPublishedAt != null,
      url: this.postUrl(p.slug),
      updatedAt: p.updatedAt,
      updatedBy: p.updatedBy,
      likes: bySlug.get(p.slug)?.likes ?? 0,
      shares: bySlug.get(p.slug)?.shares ?? 0,
      messages: votes.get(p.slug)?.messages ?? 0,
    }));
    return { data, total, page, pageSize };
  }

  async findPost(id: number) {
    const p = await this.posts.findOneBy({ id });
    if (!p) throw new NotFoundException('There is no such post.');
    return p;
  }

  async postDetail(id: number): Promise<PostDetailDto> {
    const p = await this.findPost(id);
    const cover = p.coverId ? ((await this.media.many([p.coverId])).get(p.coverId) ?? null) : null;
    return { ...p, slugLocked: p.firstPublishedAt != null, url: this.postUrl(p.slug), cover };
  }

  async createPost(dto: PostInputDto, by: string) {
    const slug = dto.slug || slugify(dto.title);
    if (!slug) throw new BadRequestException({ message: 'Please check the highlighted fields.', errors: { slug: 'Choose a slug' } });
    const post = this.posts.create({ slug, status: 'draft', updatedBy: by });
    await this.applyPost(post, dto);
    await this.ensureFreeSlug(slug);
    const saved = await this.posts.save(post);
    return this.postDetail(saved.id);
  }

  async updatePost(id: number, dto: PostInputDto, by: string) {
    const post = await this.findPost(id);
    const slug = dto.slug || post.slug;
    if (slug !== post.slug) {
      if (post.firstPublishedAt != null) {
        throw new BadRequestException({
          message: 'Please check the highlighted fields.',
          errors: { slug: 'The slug is locked: the post has been published, and its likes, feedback and e-mails use it' },
        });
      }
      await this.ensureFreeSlug(slug);
      post.slug = slug;
    }
    await this.applyPost(post, dto);
    if (post.status === 'published') await this.checkPublishable(post);
    post.updatedBy = by;
    await this.posts.save(post);
    if (post.status === 'published') this.touch();
    return this.postDetail(id);
  }

  async publish(id: number, by: string) {
    const post = await this.findPost(id);
    post.publishedDate ??= Date.now();
    await this.checkPublishable(post);
    post.status = 'published';
    post.firstPublishedAt ??= Date.now();
    post.updatedBy = by;
    await this.posts.save(post);
    this.touch();
    return this.postDetail(id);
  }

  async unpublish(id: number, by: string) {
    const post = await this.findPost(id);
    post.status = 'draft';
    post.updatedBy = by;
    await this.posts.save(post);
    this.touch();
    return this.postDetail(id);
  }

  async removePost(id: number) {
    const post = await this.findPost(id);
    await this.posts.delete({ id: post.id });
    this.touch();
  }

  /** Copies the form onto the entity, checking references. Doesn't save. */
  private async applyPost(post: Post, dto: PostInputDto) {
    const errors: Record<string, string> = {};
    const problems = validateBody(dto.body);
    if (problems.length) errors.body = problems.map((p) => (p.line ? `Line ${p.line}: ${p.message}` : p.message)).join('; ');
    if (dto.author && !(await this.authors.existsBy({ slug: dto.author }))) errors.author = `There is no author "${dto.author}"`;
    const topics = [...new Set(dto.topics)];
    if (topics.length) {
      const known = new Set((await this.topics.findBy({ slug: In(topics) })).map((t) => t.slug));
      const unknown = topics.filter((t) => !known.has(t));
      if (unknown.length) errors.topics = `Unknown topic${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}`;
    }
    if (dto.coverId && !(await this.media.many([dto.coverId])).has(dto.coverId)) errors.coverId = 'That image no longer exists';
    if (Object.keys(errors).length) throw new BadRequestException({ message: 'Please check the highlighted fields.', errors });

    post.title = dto.title;
    post.excerpt = dto.excerpt;
    post.body = dto.body;
    post.publishedDate = toMs(dto.publishedDate);
    post.updatedDate = toMs(dto.updatedDate);
    post.authorSlug = dto.author;
    post.topics = topics;
    post.tags = [...new Set(dto.tags.map((t) => t.trim()).filter(Boolean))];
    post.coverId = dto.coverId || null;
    post.coverAlt = dto.coverAlt;
    post.series = dto.series;
    post.featured = dto.featured;
    post.canonicalUrl = dto.canonicalUrl;
    post.repositoryUrl = dto.repositoryUrl;
    post.seoTitle = dto.seoTitle ?? post.seoTitle ?? '';
    post.seoDescription = dto.seoDescription ?? post.seoDescription ?? '';
    post.noindex = dto.noindex ?? post.noindex ?? false;
  }

  private async checkPublishable(post: Post) {
    const errors: Record<string, string> = {};
    if (!post.authorSlug) errors.author = 'Choose an author before publishing';
    if (!post.publishedDate) errors.publishedDate = 'Set a date before publishing';
    if (!post.body.trim()) errors.body = 'Write something before publishing';
    if (Object.keys(errors).length) throw new BadRequestException({ message: 'The post is not ready to publish.', errors });
  }

  private async ensureFreeSlug(slug: string) {
    if (await this.posts.existsBy({ slug })) {
      throw new BadRequestException({ message: 'Please check the highlighted fields.', errors: { slug: `Another post already uses "${slug}"` } });
    }
  }

  // ---------------------------------------------------------------------------- topics

  async listTopics(): Promise<TopicDto[]> {
    const [topics, counts] = await Promise.all([this.topics.find({ order: { sortOrder: 'ASC', name: 'ASC' } }), this.usage()]);
    return topics.map((t) => ({ ...t, posts: counts.topics.get(t.slug) ?? 0 }));
  }

  async createTopic(dto: TopicInputDto) {
    if (await this.topics.existsBy({ slug: dto.slug })) throw new BadRequestException({ message: 'Please check the highlighted fields.', errors: { slug: `A topic "${dto.slug}" already exists` } });
    const { id } = await this.topics.save(this.topics.create({ ...dto }));
    this.touch();
    return this.topics.findOneByOrFail({ id });
  }

  async updateTopic(id: number, dto: TopicInputDto) {
    const t = await this.topics.findOneBy({ id });
    if (!t) throw new NotFoundException();
    if (dto.slug !== t.slug) {
      throw new BadRequestException({ message: 'Please check the highlighted fields.', errors: { slug: "A topic's slug can't change: posts and subscribers' choices use it" } });
    }
    Object.assign(t, { name: dto.name, description: dto.description, icon: dto.icon, accent: dto.accent, sortOrder: dto.sortOrder });
    await this.topics.save(t);
    this.touch();
    return t;
  }

  async removeTopic(id: number) {
    const t = await this.topics.findOneBy({ id });
    if (!t) throw new NotFoundException();
    const used = (await this.usage()).topics.get(t.slug) ?? 0;
    if (used) throw new ConflictException(`${used} post${used > 1 ? 's use' : ' uses'} this topic. Remove it from them first.`);
    await this.topics.delete({ id });
    this.touch();
  }

  // --------------------------------------------------------------------------- authors

  async listAuthors(): Promise<AuthorDto[]> {
    const [authors, counts] = await Promise.all([this.authors.find({ order: { name: 'ASC' } }), this.usage()]);
    return authors.map((a) => ({ ...a, posts: counts.authors.get(a.slug) ?? 0 }));
  }

  async createAuthor(dto: AuthorInputDto) {
    if (await this.authors.existsBy({ slug: dto.slug })) throw new BadRequestException({ message: 'Please check the highlighted fields.', errors: { slug: `An author "${dto.slug}" already exists` } });
    await this.checkAvatar(dto.avatarId);
    // Re-read: TypeORM's insert result reloads defaulted columns (links would come back as the default []).
    const { id } = await this.authors.save(this.authors.create({ ...dto, avatarId: dto.avatarId || null }));
    this.touch();
    return this.authors.findOneByOrFail({ id });
  }

  async updateAuthor(id: number, dto: AuthorInputDto) {
    const a = await this.authors.findOneBy({ id });
    if (!a) throw new NotFoundException();
    if (dto.slug !== a.slug) {
      throw new BadRequestException({ message: 'Please check the highlighted fields.', errors: { slug: "An author's slug can't change: posts and author pages use it" } });
    }
    await this.checkAvatar(dto.avatarId);
    Object.assign(a, { name: dto.name, role: dto.role, bio: dto.bio, avatarId: dto.avatarId || null, links: dto.links });
    await this.authors.save(a);
    this.touch();
    return a;
  }

  async removeAuthor(id: number) {
    const a = await this.authors.findOneBy({ id });
    if (!a) throw new NotFoundException();
    const used = (await this.usage()).authors.get(a.slug) ?? 0;
    if (used) throw new ConflictException(`${used} post${used > 1 ? 's are' : ' is'} by this author. Change their author first.`);
    await this.authors.delete({ id });
    this.touch();
  }

  private async checkAvatar(id: string | null) {
    if (id && !(await this.media.many([id])).has(id)) {
      throw new BadRequestException({ message: 'Please check the highlighted fields.', errors: { avatarId: 'That image no longer exists' } });
    }
  }

  /** Posts per topic and per author (drafts included: they still reference them). */
  private async usage() {
    const rows = await this.posts.find({ select: { authorSlug: true, topics: true } });
    const topics = new Map<string, number>();
    const authors = new Map<string, number>();
    for (const r of rows) {
      for (const t of r.topics) topics.set(t, (topics.get(t) ?? 0) + 1);
      if (r.authorSlug) authors.set(r.authorSlug, (authors.get(r.authorSlug) ?? 0) + 1);
    }
    return { topics, authors };
  }

  // ----------------------------------------------------------------------------- pages

  private pageDto(p: Page): PageDto {
    return { ...p, url: new URL(`/${p.slug}/`, this.config.get('PUBLIC_SITE_URL')).toString() };
  }

  async listPages(): Promise<PageDto[]> {
    return (await this.pages.find({ order: { title: 'ASC' } })).map((p) => this.pageDto(p));
  }

  async findPage(id: number) {
    const p = await this.pages.findOneBy({ id });
    if (!p) throw new NotFoundException('There is no such page.');
    return p;
  }

  async pageDetail(id: number) {
    return this.pageDto(await this.findPage(id));
  }

  async savePage(id: number | null, dto: PageInputDto) {
    const errors: Record<string, string> = {};
    if (RESERVED_PAGE_SLUGS.includes(dto.slug)) errors.slug = `"${dto.slug}" is used by the site itself`;
    const problems = validateBody(dto.body);
    if (problems.length) errors.body = problems.map((p) => (p.line ? `Line ${p.line}: ${p.message}` : p.message)).join('; ');
    const clash = await this.pages.findOneBy({ slug: dto.slug });
    if (clash && clash.id !== id) errors.slug = `Another page already uses "${dto.slug}"`;
    if (Object.keys(errors).length) throw new BadRequestException({ message: 'Please check the highlighted fields.', errors });

    const page = id ? await this.findPage(id) : this.pages.create();
    Object.assign(page, {
      slug: dto.slug, title: dto.title, description: dto.description, body: dto.body, updatedDate: toMs(dto.updatedDate),
      showInHeader: dto.showInHeader, showInFooter: dto.showInFooter,
    });
    const saved = await this.pages.save(page);
    this.touch();
    return this.pageDto(await this.pages.findOneByOrFail({ id: saved.id }));
  }

  async removePage(id: number) {
    await this.findPage(id);
    await this.pages.delete({ id });
    this.touch();
  }

  // ------------------------------------------------------------------------ the website

  /** Changes whenever the published content does: an edit here, or a scheduled post's date arriving. */
  async version() {
    const visible = await this.posts.countBy({ status: 'published', publishedDate: LessThanOrEqual(Date.now()) });
    return `${this.boot}.${this.counter}.${visible}`;
  }

  /** Everything the website renders, in one response (it keeps it until `version` changes). */
  async snapshot(): Promise<ContentSnapshotDto> {
    const version = await this.version();
    const [posts, topics, authors, pages, site, home] = await Promise.all([
      this.posts.find({ where: { status: 'published', publishedDate: LessThanOrEqual(Date.now()) }, order: { publishedDate: 'DESC', id: 'DESC' } }),
      this.topics.find({ order: { sortOrder: 'ASC', name: 'ASC' } }),
      this.authors.find({ order: { name: 'ASC' } }),
      this.pages.find({ order: { title: 'ASC' } }),
      this.site.site(),
      this.site.home(),
    ]);
    const media = await this.media.many([...posts.map((p) => p.coverId), ...authors.map((a) => a.avatarId)]);
    return {
      version,
      posts: posts.map((p) => this.publicPost(p, media)),
      topics: topics.map((t) => this.publicTopic(t)),
      authors: authors.map((a) => this.publicAuthor(a, media)),
      pages: pages.map((p) => this.publicPage(p)),
      site,
      home,
    };
  }

  publicPost(p: Post, media: Map<string, Media>): PublicPostDto {
    return {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      body: p.body,
      publishedDate: toIso(p.publishedDate ?? p.createdAt.getTime())!,
      updatedDate: toIso(p.updatedDate),
      author: p.authorSlug,
      topics: p.topics,
      tags: p.tags,
      cover: image(p.coverId, media, p.coverAlt),
      coverAlt: p.coverAlt,
      series: p.series,
      featured: p.featured,
      canonicalUrl: p.canonicalUrl || null,
      repositoryUrl: p.repositoryUrl || null,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      noindex: p.noindex,
      draft: statusOf(p) !== 'published',
      revision: `${p.id}.${new Date(p.updatedAt).getTime()}`,
    };
  }

  private publicTopic(t: Topic): PublicTopicDto {
    return { slug: t.slug, name: t.name, description: t.description, icon: t.icon, accent: t.accent, order: t.sortOrder };
  }

  private publicAuthor(a: Author, media: Map<string, Media>): PublicAuthorDto {
    return { slug: a.slug, name: a.name, role: a.role, bio: a.bio, avatar: image(a.avatarId, media, ''), links: a.links };
  }

  private publicPage(p: Page): PublicPageDto {
    return {
      slug: p.slug, title: p.title, description: p.description, body: p.body, updatedDate: toIso(p.updatedDate),
      showInHeader: p.showInHeader, showInFooter: p.showInFooter, revision: `${p.id}.${new Date(p.updatedAt).getTime()}`,
    };
  }

  // ---------------------------------------------------------------------------- preview

  private sign(id: number, exp: number) {
    return createHmac('sha256', this.config.get('JWT_SECRET_KEY')).update(`preview:${id}:${exp}`).digest('base64url');
  }

  /** A link to the website's preview of a post (drafts included), valid for two hours. */
  async previewLink(id: number) {
    const post = await this.findPost(id);
    const expiresAt = Date.now() + PREVIEW_TTL_MS;
    const token = `${post.id}.${expiresAt}.${this.sign(post.id, expiresAt)}`;
    const url = new URL(`/preview/${encodeURIComponent(post.slug)}/`, this.config.get('PUBLIC_SITE_URL'));
    url.searchParams.set('token', token);
    return { url: url.toString(), expiresAt };
  }

  /** The post a preview token was made for, if it is valid, unexpired and for this slug. */
  async preview(slug: string, token: string) {
    const m = /^(\d{1,10})\.(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(token);
    if (!m) throw new NotFoundException();
    const [id, exp] = [Number(m[1]), Number(m[2])];
    const expected = Buffer.from(this.sign(id, exp));
    const given = Buffer.from(m[3]!);
    if (exp < Date.now() || expected.length !== given.length || !timingSafeEqual(expected, given)) throw new NotFoundException();
    const post = await this.posts.findOneBy({ id });
    if (!post || post.slug !== slug) throw new NotFoundException();
    return { post: this.publicPost(post, await this.media.many([post.coverId])) };
  }
}

function image(id: string | null, media: Map<string, Media>, alt: string): PublicImageDto | null {
  const m = id ? media.get(id) : undefined;
  return m ? { id: m.id, width: m.width, height: m.height, alt: alt || m.alt } : null;
}
