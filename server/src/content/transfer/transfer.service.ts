import { readFile } from 'node:fs/promises';
import { posix } from 'node:path';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validateSync, type ValidationError } from 'class-validator';
import { strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import sharp from 'sharp';
import { In, type FindOptionsWhere, type Repository } from 'typeorm';
import { ACCENTS, CONTENT_ICONS, SLUG } from '../content.constants';
import { AuthorInputDto, HomeDto, PageInputDto, PostInputDto, SiteSettingsDto, TopicInputDto } from '../content.dto';
import { Author, Media, Page, Post, Topic } from '../content.entities';
import { ContentService } from '../content.service';
import { bodyImageUrls, validateBody } from '../markdoc-schema';
import { MEDIA_URL, MediaService, mediaPath } from '../media.service';
import { SiteContentService } from '../site-content.service';
import {
  bool, isoDate, num, parseFrontMatter, parseYaml, str, strList, toFrontMatter, toYaml, yamlDate, type Data,
} from './front-matter';

// Import and export of content as Markdown + assets (docs/content-guide.md → Import and export).
//
//   posts/<slug>/index.md        front matter + Markdoc body; images in posts/<slug>/assets/
//   pages/<slug>/index.md        the same for pages
//   topics/<slug>.yaml           name, description, icon, accent, order
//   authors/<slug>.yaml          name, role, bio, avatar (./assets/…), links
//   site.yaml, home.yaml         site settings and home page texts
//
// Import also reads the old website layout (src/content/posts/<slug>.mdoc, settings.yaml, images in
// src/assets/ and public/), so content from a Keystatic checkout moves over in one step.

export const IMPORT_LIMITS = { uploadBytes: 50 * 1024 * 1024, unpackedBytes: 200 * 1024 * 1024, entries: 2000 };

export type ImportKind = 'topic' | 'author' | 'post' | 'page' | 'site' | 'home';
export type ImportAction = 'create' | 'update' | 'skip' | 'error';
/** `needs`: the archive items (`topic:<slug>`, `author:<slug>`) a post depends on that aren't in the database yet. */
export type ImportItem = { kind: ImportKind; slug: string; source: string; action: ImportAction; messages: string[]; needs: string[] };
/** `only`: the archive paths (`source`) to import; leave it out to import everything. */
export type ImportOptions = { dryRun: boolean; onConflict: 'skip' | 'overwrite'; asDraft: boolean; by: string; only?: string[] };
/**
 * Slug lists narrow a kind to those items (missing = all of it, empty = none). `withDependencies` adds
 * the topics and authors the exported posts use.
 */
export type ExportOptions = {
  include: ImportKind[];
  status: 'all' | 'published';
  posts?: string[];
  pages?: string[];
  topics?: string[];
  authors?: string[];
  withDependencies?: boolean;
};

type Files = Map<string, Uint8Array>;
type Doc = { kind: ImportKind; slug: string; path: string };

/** A failure of one item, reported in its row instead of stopping the run. */
class ItemError extends Error {}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const EXT_BY_MIME: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };

@Injectable()
export class TransferService {

  constructor(
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Topic) private readonly topics: Repository<Topic>,
    @InjectRepository(Author) private readonly authors: Repository<Author>,
    @InjectRepository(Page) private readonly pages: Repository<Page>,
    private readonly content: ContentService,
    private readonly media: MediaService,
    private readonly site: SiteContentService,
  ) {}

  // ============================================================================= reading input

  /** The files of an uploaded .zip, .md or .mdoc, with names checked and sizes capped. */
  readUpload(data: Buffer, fileName: string): Files {
    if (data.length > IMPORT_LIMITS.uploadBytes) throw new BadRequestException('The file is larger than 50 MB. Split the export into smaller parts.');
    const name = fileName.toLowerCase();
    if (/\.(md|mdoc|markdown)$/.test(name)) return new Map([[safePath(posix.basename(fileName)), new Uint8Array(data)]]);
    if (!name.endsWith('.zip') && !(data[0] === 0x50 && data[1] === 0x4b)) {
      throw new BadRequestException('Upload a .zip export, or a single .md file.');
    }
    let total = 0;
    let count = 0;
    let unzipped: Record<string, Uint8Array>;
    try {
      unzipped = unzipSync(new Uint8Array(data), {
        filter: (f) => {
          if (f.name.endsWith('/')) return false;
          if (++count > IMPORT_LIMITS.entries) throw new BadRequestException(`The archive has more than ${IMPORT_LIMITS.entries} files.`);
          safePath(f.name);
          total += f.originalSize;
          if (total > IMPORT_LIMITS.unpackedBytes) throw new BadRequestException('The archive unpacks to more than 200 MB.');
          return !/(^|\/)(__MACOSX|\.DS_Store)/.test(f.name);
        },
      });
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new BadRequestException('That file is not a valid .zip archive.');
    }
    const files: Files = new Map();
    for (const [path, bytes] of Object.entries(unzipped)) {
      if (bytes.length > IMPORT_LIMITS.unpackedBytes) throw new BadRequestException('The archive unpacks to more than 200 MB.');
      files.set(safePath(path), bytes);
    }
    return stripCommonRoot(files);
  }

  /** What an archive contains, by kind and slug. */
  private discover(files: Files): Doc[] {
    const docs: Doc[] = [];
    const seen = new Set<string>();
    const add = (kind: ImportKind, slug: string, path: string) => {
      const key = `${kind}:${slug}`;
      if (seen.has(key)) return;
      seen.add(key);
      docs.push({ kind, slug, path });
    };
    for (const path of [...files.keys()].sort()) {
      let m: RegExpExecArray | null;
      if ((m = /(?:^|\/)posts\/([^/]+)\/index\.(?:md|mdoc|markdown)$/.exec(path)) || (m = /(?:^|\/)posts\/([^/]+)\.(?:md|mdoc|markdown)$/.exec(path))) {
        add('post', m[1]!, path);
      } else if ((m = /(?:^|\/)pages\/([^/]+)\/index\.(?:md|mdoc|markdown)$/.exec(path)) || (m = /(?:^|\/)pages\/([^/]+)\.(?:md|mdoc|markdown)$/.exec(path))) {
        add('page', m[1]!, path);
      } else if ((m = /(?:^|\/)topics\/([^/]+)\.ya?ml$/.exec(path))) {
        add('topic', m[1]!, path);
      } else if ((m = /(?:^|\/)authors\/([^/]+)\.ya?ml$/.exec(path))) {
        add('author', m[1]!, path);
      } else if (/(?:^|\/)(site|settings)\.ya?ml$/.test(path)) {
        add('site', 'site', path);
      } else if (/(?:^|\/)home\.ya?ml$/.test(path)) {
        add('home', 'home', path);
      } else if ((m = /^([^/]+)\.(?:md|mdoc|markdown)$/.exec(path)) && !/^readme$/i.test(m[1]!)) {
        add('post', m[1]!, path); // a single post uploaded as a plain .md
      }
    }
    const order: ImportKind[] = ['topic', 'author', 'post', 'page', 'site', 'home'];
    return docs.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  }

  // ==================================================================================== import

  async import(files: Files, opts: ImportOptions): Promise<ImportItem[]> {
    let docs = this.discover(files);
    if (!docs.length) throw new BadRequestException('Nothing to import: no posts/, pages/, topics/, authors/, site.yaml or home.yaml found.');
    if (opts.only) {
      const only = new Set(opts.only);
      docs = docs.filter((d) => only.has(d.path));
      if (!docs.length) throw new BadRequestException('None of the selected items are in this file. Check it again.');
    }
    const archiveTopics = new Set(docs.filter((d) => d.kind === 'topic').map((d) => d.slug));
    const archiveAuthors = new Set(docs.filter((d) => d.kind === 'author').map((d) => d.slug));
    const uploaded = new Map<string, string>(); // archive path → media id (one upload per file per run)
    const items: ImportItem[] = [];

    for (const doc of docs) {
      const item: ImportItem = { kind: doc.kind, slug: doc.slug, source: doc.path, action: 'create', messages: [], needs: [] };
      items.push(item);
      const created: string[] = [];
      try {
        const text = Buffer.from(files.get(doc.path)!).toString('utf8');
        const ctx: Ctx = { files, doc, opts, item, uploaded, created, archiveTopics, archiveAuthors };
        if (doc.kind === 'topic') await this.importTopic(text, ctx);
        else if (doc.kind === 'author') await this.importAuthor(text, ctx);
        else if (doc.kind === 'post') await this.importPost(text, ctx);
        else if (doc.kind === 'page') await this.importPage(text, ctx);
        else if (doc.kind === 'site') await this.importSite(text, ctx);
        else await this.importHome(text, ctx);
      } catch (e) {
        item.action = 'error';
        item.messages.push(messageOf(e));
        // Keep the item all-or-nothing: drop images uploaded for it alone.
        for (const id of created) {
          await this.media.remove(id).catch(() => undefined);
          for (const [k, v] of uploaded) if (v === id) uploaded.delete(k);
        }
      }
    }
    return items;
  }

  private async conflict(ctx: Ctx, exists: boolean) {
    if (!exists) return false;
    if (ctx.opts.onConflict === 'skip') {
      ctx.item.action = 'skip';
      ctx.item.messages.push('Already exists; skipped');
      return true;
    }
    ctx.item.action = 'update';
    ctx.item.messages.push('Already exists; will be overwritten');
    return false;
  }

  private async importTopic(text: string, ctx: Ctx) {
    const d = parseYaml(text, ctx.doc.path);
    const dto = check(TopicInputDto, {
      slug: str(d.slug, ctx.doc.slug),
      name: str(d.name, ctx.doc.slug),
      description: str(d.description),
      icon: (CONTENT_ICONS as readonly string[]).includes(str(d.icon)) ? str(d.icon) : 'book',
      accent: (ACCENTS as readonly string[]).includes(str(d.accent)) ? str(d.accent) : 'teal',
      sortOrder: num(d.order ?? d.sortOrder, 10),
    });
    ctx.item.slug = dto.slug;
    const existing = await this.topics.findOneBy({ slug: dto.slug });
    if (await this.conflict(ctx, !!existing)) return;
    if (ctx.opts.dryRun) return;
    if (existing) await this.content.updateTopic(existing.id, dto);
    else await this.content.createTopic(dto);
  }

  private async importAuthor(text: string, ctx: Ctx) {
    const d = parseYaml(text, ctx.doc.path);
    const slug = str(d.slug, ctx.doc.slug);
    ctx.item.slug = slug;
    const existing = await this.authors.findOneBy({ slug });
    if (await this.conflict(ctx, !!existing)) return;
    const avatarRef = str(d.avatar);
    const avatarId = avatarRef ? await this.asset(ctx, avatarRef) : null;
    const dto = check(AuthorInputDto, {
      slug,
      name: str(d.name, slug),
      role: str(d.role),
      bio: str(d.bio),
      avatarId: avatarId && !avatarId.startsWith('http') ? mediaIdOf(avatarId) : null,
      links: Array.isArray(d.links) ? (d.links as Data[]).map((l) => ({ network: str(l?.network), url: str(l?.url) })) : [],
    });
    if (ctx.opts.dryRun) return;
    if (existing) await this.content.updateAuthor(existing.id, dto);
    else await this.content.createAuthor(dto);
  }

  private async importPost(text: string, ctx: Ctx) {
    const { data: d, body } = parseFrontMatter(text, ctx.doc.path);
    const slug = str(d.slug, ctx.doc.slug).toLowerCase();
    ctx.item.slug = slug;
    if (!SLUG.test(slug)) throw new ItemError(`"${slug}" is not a valid slug (lowercase letters, digits and dashes)`);
    const existing = await this.posts.findOneBy({ slug });
    if (await this.conflict(ctx, !!existing)) return;

    const author = str(d.author);
    const draft = ctx.opts.asDraft || bool(d.draft, false) || !author;
    const topics = strList(d.topics);
    const problems: string[] = [];
    if (author && !(await this.authors.existsBy({ slug: author }))) {
      if (ctx.archiveAuthors.has(author)) ctx.item.needs.push(`author:${author}`);
      else problems.push(`Unknown author "${author}"`);
    }
    for (const t of topics) {
      if (await this.topics.existsBy({ slug: t })) continue;
      if (ctx.archiveTopics.has(t)) ctx.item.needs.push(`topic:${t}`);
      else problems.push(`Unknown topic "${t}"`);
    }
    const bodyProblems = validateBody(body);
    for (const p of bodyProblems) problems.push(`Body${p.line ? ` line ${p.line}` : ''}: ${p.message}`);
    if (problems.length) throw new ItemError(problems.join('; '));

    const newBody = await this.rewriteBody(ctx, body);
    const coverRef = str(d.cover);
    const cover = coverRef ? await this.asset(ctx, coverRef) : null;
    if (cover?.startsWith('http')) ctx.item.messages.push('The cover is an outside URL and was left out (covers must be uploaded images)');

    const dto = check(PostInputDto, {
      slug,
      title: str(d.title, slug),
      excerpt: str(d.excerpt ?? d.description),
      body: newBody,
      publishedDate: isoDate(d.publishedDate ?? d.date),
      updatedDate: isoDate(d.updatedDate),
      author,
      topics,
      tags: strList(d.tags),
      coverId: cover && !cover.startsWith('http') ? mediaIdOf(cover) : null,
      coverAlt: str(d.coverAlt),
      series: str(d.series),
      featured: bool(d.featured),
      canonicalUrl: str(d.canonicalUrl),
      repositoryUrl: str(d.repositoryUrl ?? d.repository),
      seoTitle: str(d.seoTitle),
      seoDescription: str(d.seoDescription),
      noindex: bool(d.noindex),
    });
    if (!draft && !dto.publishedDate) ctx.item.messages.push('No publishedDate: today is used');
    if (!author) ctx.item.messages.push('No author: imported as a draft');
    else if (draft) ctx.item.messages.push('Imported as a draft');
    if (ctx.opts.dryRun) return;

    const saved = existing ? await this.content.updatePost(existing.id, dto, ctx.opts.by) : await this.content.createPost(dto, ctx.opts.by);
    if (!draft && saved.status !== 'published') await this.content.publish(saved.id, ctx.opts.by);
    if (draft && saved.status === 'published') await this.content.unpublish(saved.id, ctx.opts.by);
  }

  private async importPage(text: string, ctx: Ctx) {
    const { data: d, body } = parseFrontMatter(text, ctx.doc.path);
    const slug = str(d.slug, ctx.doc.slug).toLowerCase();
    ctx.item.slug = slug;
    const existing = await this.pages.findOneBy({ slug });
    if (await this.conflict(ctx, !!existing)) return;
    const problems = validateBody(body);
    if (problems.length) throw new ItemError(problems.map((p) => `Body${p.line ? ` line ${p.line}` : ''}: ${p.message}`).join('; '));
    const dto = check(PageInputDto, {
      slug,
      title: str(d.title, slug),
      description: str(d.description),
      body: await this.rewriteBody(ctx, body),
      updatedDate: isoDate(d.updatedDate),
      showInHeader: bool(d.showInHeader, false),
      showInFooter: bool(d.showInFooter, true),
    });
    if (ctx.opts.dryRun) return;
    await this.content.savePage(existing?.id ?? null, dto);
  }

  private async importSite(text: string, ctx: Ctx) {
    const d = parseYaml(text, ctx.doc.path);
    const current = await this.site.site();
    const merged = { ...current, ...Object.fromEntries(Object.entries(d).filter(([k]) => k in current)) };
    const dto = check(SiteSettingsDto, merged);
    const saved = await this.site.saved('site');
    ctx.item.action = saved ? 'update' : 'create';
    if (saved && ctx.opts.onConflict === 'skip') {
      ctx.item.action = 'skip';
      ctx.item.messages.push('Site settings were saved before; they are only replaced with "overwrite"');
      return;
    }
    if (ctx.opts.dryRun) return;
    await this.site.saveSite(dto);
    this.content.touch();
  }

  private async importHome(text: string, ctx: Ctx) {
    const d = parseYaml(text, ctx.doc.path);
    const current = await this.site.home();
    const dto = check(HomeDto, { ...current, ...Object.fromEntries(Object.entries(d).filter(([k]) => k in current)) });
    const saved = await this.site.saved('home');
    ctx.item.action = saved ? 'update' : 'create';
    if (saved && ctx.opts.onConflict === 'skip') {
      ctx.item.action = 'skip';
      ctx.item.messages.push('Home page texts were saved before; they are only replaced with "overwrite"');
      return;
    }
    if (ctx.opts.dryRun) return;
    await this.site.saveHome(dto);
    this.content.touch();
  }

  /** Uploads every image a body references and points the references at the uploaded copies. */
  private async rewriteBody(ctx: Ctx, body: string) {
    let out = body;
    for (const ref of bodyImageUrls(body)) {
      const url = await this.asset(ctx, ref);
      if (url !== ref) out = replaceRef(out, ref, url);
    }
    return out;
  }

  /**
   * Resolves an image reference of a document: outside URLs and existing media stay as they are; a
   * file in the archive is uploaded (once per run). Returns the URL to use; throws when it's missing.
   */
  private async asset(ctx: Ctx, ref: string): Promise<string> {
    if (/^https?:\/\//i.test(ref) || ref.startsWith('data:')) return ref;
    const existingId = mediaIdOf(ref);
    if (existingId) {
      if ((await this.media.many([existingId])).has(existingId)) return mediaPath(existingId);
      throw new ItemError(`Image ${ref} is not in this blog's media library`);
    }
    const path = this.locate(ctx.files, ctx.doc.path, ref);
    if (!path) throw new ItemError(`Missing image ${ref} (it isn't in the archive)`);
    if (!IMAGE_EXT.test(path)) throw new ItemError(`${ref} is not an image file`);
    const known = ctx.uploaded.get(path);
    if (known) return mediaPath(known);
    const bytes = Buffer.from(ctx.files.get(path)!);
    if (ctx.opts.dryRun) {
      try {
        await sharp(bytes).metadata();
      } catch {
        throw new ItemError(`${ref} is not a readable image`);
      }
      return ref;
    }
    let m: Media;
    try {
      m = await this.media.save(bytes, posix.basename(path), '', ctx.opts.by);
    } catch (e) {
      throw new ItemError(`${ref}: ${messageOf(e)}`);
    }
    ctx.uploaded.set(path, m.id);
    ctx.created.push(m.id);
    return mediaPath(m.id);
  }

  /** The archive path a reference points at: relative to the document, or a site path under public/. */
  private locate(files: Files, docPath: string, ref: string) {
    const clean = decodeURIComponent(ref.split(/[?#]/)[0]!);
    if (clean.startsWith('/')) {
      const tail = clean.slice(1);
      if (files.has(tail)) return tail;
      for (const k of files.keys()) if (k === `public/${tail}` || k.endsWith(`/public/${tail}`)) return k;
      return null;
    }
    const p = posix.normalize(posix.join(posix.dirname(docPath), clean));
    return !p.startsWith('..') && files.has(p) ? p : null;
  }

  // ==================================================================================== export

  /** One post: a .md when it has no images, else a .zip with posts/<slug>/index.md and its assets. */
  async exportPost(id: number): Promise<{ fileName: string; data: Buffer; type: string }> {
    const post = await this.content.findPost(id);
    const zip: Zippable = {};
    const md = await this.postMarkdown(post, zip, `posts/${post.slug}`);
    if (!Object.keys(zip).length) return { fileName: `${post.slug}.md`, data: Buffer.from(md), type: 'text/markdown; charset=utf-8' };
    zip[`posts/${post.slug}/index.md`] = strToU8(md);
    return { fileName: `${post.slug}.zip`, data: Buffer.from(zipSync(zip, { level: 6 })), type: 'application/zip' };
  }

  async exportAll(opts: ExportOptions): Promise<Buffer> {
    const zip: Zippable = {};
    const has = (k: ImportKind) => opts.include.includes(k);
    const bySlug = <T extends { slug: string }>(slugs: string[] | undefined): FindOptionsWhere<T> => (slugs ? ({ slug: In(slugs) } as FindOptionsWhere<T>) : {});
    // Posts first, so their topics and authors can be added.
    let posts: Post[] = [];
    if (has('post')) {
      posts = await this.posts.find({
        where: { ...bySlug<Post>(opts.posts), ...(opts.status === 'published' ? { status: 'published' as const } : {}) },
        order: { publishedDate: 'DESC' },
      });
    }
    let topicSlugs = opts.topics;
    let authorSlugs = opts.authors;
    const exportTopics = has('topic') || (opts.withDependencies && posts.length > 0);
    const exportAuthors = has('author') || (opts.withDependencies && posts.length > 0);
    if (opts.withDependencies && posts.length) {
      const usedTopics = posts.flatMap((p) => p.topics);
      const usedAuthors = posts.map((p) => p.authorSlug).filter((a): a is string => !!a);
      // A kind that isn't exported gets only what the posts use; a narrowed one gets those added.
      topicSlugs = has('topic') ? (topicSlugs ? [...new Set([...topicSlugs, ...usedTopics])] : undefined) : [...new Set(usedTopics)];
      authorSlugs = has('author') ? (authorSlugs ? [...new Set([...authorSlugs, ...usedAuthors])] : undefined) : [...new Set(usedAuthors)];
    }
    if (exportTopics) {
      for (const t of await this.topics.find({ where: bySlug<Topic>(topicSlugs) })) {
        zip[`topics/${t.slug}.yaml`] = strToU8(toYaml({ name: t.name, description: t.description, icon: t.icon, accent: t.accent, order: t.sortOrder }));
      }
    }
    if (exportAuthors) {
      for (const a of await this.authors.find({ where: bySlug<Author>(authorSlugs) })) {
        const avatar = a.avatarId ? await this.addAsset(zip, 'authors', a.avatarId) : undefined;
        zip[`authors/${a.slug}.yaml`] = strToU8(toYaml({ name: a.name, role: a.role, bio: a.bio, avatar, links: a.links.length ? a.links : undefined }));
      }
    }
    for (const p of posts) zip[`posts/${p.slug}/index.md`] = strToU8(await this.postMarkdown(p, zip, `posts/${p.slug}`));
    if (has('page')) {
      for (const p of await this.pages.find({ where: bySlug<Page>(opts.pages) })) {
        const body = await this.exportBody(p.body, zip, `pages/${p.slug}`);
        const fm = { title: p.title, description: p.description, updatedDate: yamlDate(p.updatedDate), showInHeader: p.showInHeader, showInFooter: p.showInFooter };
        zip[`pages/${p.slug}/index.md`] = strToU8(toFrontMatter(fm, body));
      }
    }
    if (has('site')) zip['site.yaml'] = strToU8(toYaml({ ...(await this.site.site()) }));
    if (has('home')) zip['home.yaml'] = strToU8(toYaml({ ...(await this.site.home()) }));
    zip['README.md'] = strToU8(
      'Astro Blog content export. Import it from the admin (Posts → Import) or with `pnpm run content:import -- <file>`.\n',
    );
    return Buffer.from(zipSync(zip, { level: 6 }));
  }

  /** What there is to export, for choosing items in the admin. */
  async exportCatalog() {
    const [posts, pages, topics, authors] = await Promise.all([
      this.posts.find({ select: { slug: true, title: true, status: true, publishedDate: true }, order: { publishedDate: 'DESC', title: 'ASC' } }),
      this.pages.find({ select: { slug: true, title: true }, order: { title: 'ASC' } }),
      this.topics.find({ select: { slug: true, name: true }, order: { sortOrder: 'ASC', name: 'ASC' } }),
      this.authors.find({ select: { slug: true, name: true }, order: { name: 'ASC' } }),
    ]);
    return {
      posts: posts.map((p) => ({ slug: p.slug, title: p.title, status: p.status })),
      pages: pages.map((p) => ({ slug: p.slug, title: p.title })),
      topics: topics.map((t) => ({ slug: t.slug, name: t.name })),
      authors: authors.map((a) => ({ slug: a.slug, name: a.name })),
    };
  }

  private async postMarkdown(p: Post, zip: Zippable, dir: string) {
    const body = await this.exportBody(p.body, zip, dir);
    const cover = p.coverId ? await this.addAsset(zip, dir, p.coverId) : undefined;
    const fm: Data = {
      title: p.title,
      excerpt: p.excerpt,
      publishedDate: yamlDate(p.publishedDate),
      updatedDate: yamlDate(p.updatedDate),
      author: p.authorSlug,
      topics: p.topics,
      tags: p.tags,
      cover,
      coverAlt: cover ? p.coverAlt : undefined,
      series: p.series,
      featured: p.featured || undefined,
      draft: p.status !== 'published',
      canonicalUrl: p.canonicalUrl,
      repositoryUrl: p.repositoryUrl || undefined,
      seoTitle: p.seoTitle || undefined,
      seoDescription: p.seoDescription || undefined,
      noindex: p.noindex || undefined,
    };
    return toFrontMatter(fm, body);
  }

  /** Copies the images a body uses into <dir>/assets/ and points the body at them. */
  private async exportBody(body: string, zip: Zippable, dir: string) {
    let out = body;
    const refs = [...new Set([...body.matchAll(MEDIA_URL)].map((m) => m[0]))];
    for (const ref of refs) {
      const id = mediaIdOf(ref)!;
      const rel = await this.addAsset(zip, dir, id).catch(() => null);
      if (rel) out = out.split(ref).join(rel);
    }
    return out;
  }

  /** Adds an image under <dir>/assets/ (once) and returns its path relative to <dir>. */
  private async addAsset(zip: Zippable, dir: string, id: string) {
    const { path, media } = await this.media.original(id);
    const base = media.fileName.replace(/\.[^.]+$/, '') || 'image';
    const name = `${id.slice(0, 8)}-${base}.${EXT_BY_MIME[media.mime] ?? 'bin'}`;
    const key = `${dir}/assets/${name}`;
    if (!zip[key]) zip[key] = new Uint8Array(await readFile(path));
    return `./assets/${name}`;
  }
}

type Ctx = {
  files: Files;
  doc: Doc;
  opts: ImportOptions;
  item: ImportItem;
  uploaded: Map<string, string>;
  created: string[];
  archiveTopics: Set<string>;
  archiveAuthors: Set<string>;
};

/** An archive entry name, normalised; absolute paths and ".." are refused (zip-slip). */
function safePath(name: string) {
  const p = name.replace(/\\/g, '/');
  if (p.startsWith('/') || /^[a-zA-Z]:/.test(p) || p.split('/').includes('..') || p.includes('\0')) {
    throw new BadRequestException(`The archive contains an unsafe path: ${name.slice(0, 120)}`);
  }
  return posix.normalize(p).replace(/^\.\//, '');
}

/** "export-2026-11-03/posts/…" → "posts/…" when every file shares one top folder. */
function stripCommonRoot(files: Files): Files {
  const tops = new Set([...files.keys()].map((k) => (k.includes('/') ? k.split('/')[0] : '')));
  if (tops.size !== 1) return files;
  const [top] = tops;
  if (!top || ['posts', 'pages', 'topics', 'authors', 'src', 'public'].includes(top)) return files;
  return new Map([...files].map(([k, v]) => [k.slice(top.length + 1), v]));
}

const mediaIdOf = (url: string) => {
  const m = new RegExp(MEDIA_URL.source).exec(url);
  return m ? m[1]! : null;
};

/** Replaces an image reference where it appears as a link target or a quoted value. */
function replaceRef(text: string, ref: string, url: string) {
  const esc = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`([("'])${esc}(?=[)"'\\s])`, 'g'), `$1${url}`);
}

function check<T extends object>(cls: new () => T, value: object): T {
  const dto = plainToInstance(cls, value);
  const errors = validateSync(dto, { whitelist: true });
  if (errors.length) throw new ItemError(flatten(errors).join('; '));
  return dto;
}

function flatten(errors: ValidationError[], prefix = ''): string[] {
  return errors.flatMap((e) => [
    ...Object.values(e.constraints ?? {}).map((m) => `${prefix}${e.property}: ${m}`),
    ...flatten(e.children ?? [], `${prefix}${e.property}.`),
  ]);
}

function messageOf(e: unknown): string {
  if (e instanceof HttpException) {
    const r = e.getResponse() as { errors?: Record<string, string>; message?: string };
    if (r && typeof r === 'object' && r.errors) return Object.entries(r.errors).map(([k, v]) => `${k}: ${v}`).join('; ');
    return typeof r === 'object' && r?.message ? String(r.message) : e.message;
  }
  return e instanceof Error ? e.message : String(e);
}
