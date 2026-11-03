import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import sharp from 'sharp';
import { Like, type Repository } from 'typeorm';
import { AppConfig } from '../config/app-config.service';
import { Author, Media, Page, Post } from './content.entities';

/** Formats accepted for upload (never SVG: it can carry script). Value = file extension. */
const FORMATS: Record<string, { ext: string; mime: string }> = {
  jpeg: { ext: 'jpg', mime: 'image/jpeg' },
  png: { ext: 'png', mime: 'image/png' },
  webp: { ext: 'webp', mime: 'image/webp' },
  gif: { ext: 'gif', mime: 'image/gif' },
  avif: { ext: 'avif', mime: 'image/avif' },
  heif: { ext: 'avif', mime: 'image/avif' },
};

/** Widths the site asks for. Anything else is refused, so the cache can't be filled with arbitrary sizes. */
export const MEDIA_WIDTHS = [320, 640, 960, 1280, 1920] as const;
export const VARIANT_FORMATS = { webp: 'image/webp', jpg: 'image/jpeg' } as const;
export type VariantFormat = keyof typeof VARIANT_FORMATS;

/** Pixels the decoder will accept (≈ 8K × 8K), against decompression bombs. */
const MAX_PIXELS = 70_000_000;

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** A media URL as stored in bodies and front matter. */
export const MEDIA_URL = /\/api\/public\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/\d+\.(?:webp|jpg))?/g;

/** Root-relative URL of the original, or of a resized copy. */
export const mediaPath = (id: string, width?: number, format: VariantFormat = 'webp') =>
  width ? `/api/public/media/${id}/${width}.${format}` : `/api/public/media/${id}`;

/** Media ids a text mentions (bodies, covers). */
export const mediaIdsIn = (text: string) => [...text.matchAll(MEDIA_URL)].map((m) => m[1]!);

/**
 * Uploaded images on disk (<MEDIA_DIR>/<id>.<ext>) with a row each in `media`. Uploads are decoded and
 * re-encoded with sharp, which drops EXIF (location) data and anything that isn't an image. Resized
 * copies are made on first request and cached in <MEDIA_DIR>/cache/.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger('Media');
  private readonly dir: string;
  private readonly cacheDir: string;
  private readonly pending = new Map<string, Promise<string>>();

  constructor(
    @InjectRepository(Media) private readonly media: Repository<Media>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Author) private readonly authors: Repository<Author>,
    @InjectRepository(Page) private readonly pages: Repository<Page>,
    private readonly config: AppConfig,
  ) {
    this.dir = resolve(config.get('MEDIA_DIR'));
    this.cacheDir = join(this.dir, 'cache');
    mkdirSync(this.cacheDir, { recursive: true });
  }

  get maxBytes() {
    return this.config.get('MEDIA_MAX_BYTES');
  }

  /** Stores an image and returns its row. Throws 400 for anything sharp can't read as an allowed image. */
  async save(buffer: Buffer, originalName: string, alt: string, by: string): Promise<Media> {
    if (buffer.length > this.maxBytes) throw new PayloadTooLargeException(`Images can be at most ${Math.round(this.maxBytes / 1048576)} MB.`);
    let meta: sharp.Metadata;
    try {
      meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata();
    } catch {
      throw new BadRequestException('That file is not an image we can use (JPEG, PNG, WebP, GIF or AVIF).');
    }
    const format = meta.format ? FORMATS[meta.format] : undefined;
    if (!format) throw new BadRequestException('Use a JPEG, PNG, WebP, GIF or AVIF image.');

    const animated = (meta.pages ?? 1) > 1;
    const img = sharp(buffer, { limitInputPixels: MAX_PIXELS, animated }).rotate();
    // Re-encode in the same format; sharp writes no metadata unless asked to.
    const out =
      format.ext === 'jpg' ? img.jpeg({ quality: 90, mozjpeg: true })
      : format.ext === 'png' ? img.png()
      : format.ext === 'webp' ? img.webp({ quality: 90 })
      : format.ext === 'gif' ? img.gif()
      : img.avif({ quality: 70 });
    const { data, info } = await out.toBuffer({ resolveWithObject: true });

    const id = randomUUID();
    const tmp = join(this.dir, `.${id}.tmp`);
    await writeFile(tmp, data);
    await rename(tmp, this.file(id, format.ext));
    return this.media.save(
      this.media.create({
        id,
        fileName: cleanName(originalName) || `${id}.${format.ext}`,
        mime: format.mime,
        width: info.width,
        height: animated && meta.pageHeight ? meta.pageHeight : info.height,
        bytes: data.length,
        alt: alt.slice(0, 300),
        createdBy: by,
      }),
    );
  }

  async get(id: string) {
    if (!ID.test(id)) throw new NotFoundException();
    const m = await this.media.findOneBy({ id });
    if (!m) throw new NotFoundException();
    return m;
  }

  /** Several rows by id (unknown ids are left out). */
  async many(ids: (string | null | undefined)[]) {
    const wanted = [...new Set(ids.filter((i): i is string => !!i && ID.test(i)))];
    if (!wanted.length) return new Map<string, Media>();
    const rows = await this.media.createQueryBuilder('m').where('m.id IN (:...ids)', { ids: wanted }).getMany();
    return new Map(rows.map((r) => [r.id, r]));
  }

  list(search = '', page = 1, pageSize = 60) {
    const where = search ? [{ fileName: Like(`%${search}%`) }, { alt: Like(`%${search}%`) }] : {};
    return this.media.findAndCount({ where, order: { createdAt: 'DESC' }, skip: (page - 1) * pageSize, take: pageSize });
  }

  async updateAlt(id: string, alt: string) {
    const m = await this.get(id);
    m.alt = alt.slice(0, 300);
    return this.media.save(m);
  }

  /** Where an image is used (refuses deletes of images still in use). */
  async usage(id: string) {
    const needle = `%/api/public/media/${id}%`;
    const [covers, bodies, avatars, pages] = await Promise.all([
      this.posts.find({ where: { coverId: id }, select: { slug: true } }),
      this.posts.find({ where: { body: Like(needle) }, select: { slug: true } }),
      this.authors.find({ where: { avatarId: id }, select: { slug: true } }),
      this.pages.find({ where: { body: Like(needle) }, select: { slug: true } }),
    ]);
    return [
      ...new Set([...covers, ...bodies].map((p) => `post:${p.slug}`)),
      ...avatars.map((a) => `author:${a.slug}`),
      ...pages.map((p) => `page:${p.slug}`),
    ];
  }

  async remove(id: string) {
    const m = await this.get(id);
    const used = await this.usage(id);
    if (used.length) throw new ConflictException(`This image is still used by ${used.join(', ')}.`);
    await this.media.delete({ id });
    await this.deleteFiles(m);
  }

  /** Path of the original file (for the public route and exports). */
  async original(id: string) {
    const m = await this.get(id);
    const path = this.file(id, extOf(m.mime));
    if (!existsSync(path)) throw new NotFoundException();
    return { path, media: m };
  }

  /** A resized copy (made once, then served from the cache). */
  async variant(id: string, width: number, format: VariantFormat) {
    if (!(MEDIA_WIDTHS as readonly number[]).includes(width) || !(format in VARIANT_FORMATS)) throw new NotFoundException();
    const { path: src, media } = await this.original(id);
    const target = join(this.cacheDir, `${id}-${width}.${format}`);
    if (existsSync(target)) return { path: target, media };
    const key = `${id}-${width}.${format}`;
    let job = this.pending.get(key);
    if (!job) {
      job = (async () => {
        const img = sharp(src, { limitInputPixels: MAX_PIXELS }).resize({ width, withoutEnlargement: true });
        const data = await (format === 'webp' ? img.webp({ quality: 80 }) : img.flatten({ background: '#ffffff' }).jpeg({ quality: 80, mozjpeg: true })).toBuffer();
        const tmp = `${target}.${randomUUID()}.tmp`;
        await writeFile(tmp, data);
        await rename(tmp, target);
        return target;
      })().finally(() => this.pending.delete(key));
      this.pending.set(key, job);
    }
    return { path: await job, media };
  }

  /** Absolute URL of a resized JPEG (feeds, e-mails, Open Graph), or null. */
  absoluteUrl(id: string | null, width = 1280, format: VariantFormat = 'jpg') {
    return id ? new URL(mediaPath(id, width, format), this.config.get('PUBLIC_SITE_URL')).toString() : null;
  }

  private file(id: string, ext: string) {
    return join(this.dir, `${id}.${ext}`);
  }

  private async deleteFiles(m: Media) {
    try {
      await unlink(this.file(m.id, extOf(m.mime)));
      for (const f of await readdir(this.cacheDir)) if (f.startsWith(`${m.id}-`)) await unlink(join(this.cacheDir, f));
    } catch (e) {
      this.logger.warn(`Could not delete files of ${m.id}: ${(e as Error).message}`);
    }
  }
}

const extOf = (mime: string) => Object.values(FORMATS).find((f) => f.mime === mime)?.ext ?? 'bin';

/** "../My Photo (1).PNG" → "My-Photo-1.PNG": a display name only, never used as a path. */
const cleanName = (name: string) =>
  name.split(/[\\/]/).pop()!.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200);
