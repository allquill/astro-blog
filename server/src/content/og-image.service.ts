import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import sharp from 'sharp';
import { LessThanOrEqual, type Repository } from 'typeorm';
import { BRAND_700, BRAND_COLORS, DEFAULT_BRAND, type BrandColor } from './content.constants';
import { Author, Post } from './content.entities';
import { SiteContentService } from './site-content.service';

/** Width and height of a share card (the size Open Graph and X's large card expect). */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const PAD = 80;
const FONT = "'Outfit', 'DejaVu Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const CACHE_SIZE = 200;

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Breaks text into at most `maxLines` lines of about `perLine` characters (a width estimate: librsvg
 * has no text wrapping), cutting over-long words and ending with an ellipsis when it doesn't fit.
 */
export function wrap(text: string, perLine: number, maxLines: number) {
  const words = text.trim().split(/\s+/).flatMap((w) => (w.length > perLine ? (w.match(new RegExp(`.{1,${perLine}}`, 'g')) ?? []) : [w]));
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= perLine) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1]!.slice(0, perLine - 1).replace(/\s+\S*$/, '')}…`;
  return kept;
}

/**
 * The share card of a post without a cover image: its title on the brand colour, with the site name and
 * the author. Drawn as SVG and rasterised by sharp. The website links it with a key that changes with
 * the post and the site settings, so the response is cached for a year; the cache here is keyed by the
 * actual content, so an old key never serves a stale card for long.
 */
@Injectable()
export class OgImageService {
  private readonly cache = new Map<string, Buffer>();

  constructor(
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Author) private readonly authors: Repository<Author>,
    private readonly site: SiteContentService,
  ) {}

  /** The card of a published post (404 for drafts, scheduled posts and unknown slugs). */
  async postCard(slug: string): Promise<Buffer> {
    const post = await this.posts.findOneBy({ slug, status: 'published', publishedDate: LessThanOrEqual(Date.now()) });
    if (!post) throw new NotFoundException('No such post');
    const [author, site] = await Promise.all([post.authorSlug ? this.authors.findOneBy({ slug: post.authorSlug }) : null, this.site.site()]);
    const brand: BrandColor = (BRAND_COLORS as readonly string[]).includes(site.brandColor) ? (site.brandColor as BrandColor) : DEFAULT_BRAND;
    const title = post.seoTitle || post.title;
    const key = JSON.stringify([slug, post.updatedAt.valueOf(), title, site.siteName, brand, author?.name ?? '']);
    const hit = this.cache.get(key);
    if (hit) {
      this.cache.delete(key);
      this.cache.set(key, hit);
      return hit;
    }
    const png = await sharp(Buffer.from(this.svg(title, site.siteName, author?.name ?? '', BRAND_700[brand]))).png({ compressionLevel: 9 }).toBuffer();
    this.cache.set(key, png);
    if (this.cache.size > CACHE_SIZE) this.cache.delete(this.cache.keys().next().value!);
    return png;
  }

  private svg(title: string, siteName: string, author: string, brand: string) {
    // Shorter titles get a bigger type size; ~0.52 em per character is a fair average for sans text.
    const size = title.length <= 40 ? 76 : title.length <= 80 ? 64 : 54;
    const perLine = Math.floor((OG_WIDTH - 2 * PAD) / (size * 0.52));
    const lines = wrap(title, perLine, 4);
    const lineHeight = Math.round(size * 1.15);
    const blockTop = (OG_HEIGHT - lines.length * lineHeight) / 2 + size * 0.8;
    const tspans = lines.map((l, i) => `<tspan x="${PAD}" y="${Math.round(blockTop + i * lineHeight)}">${xml(l)}</tspan>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${brand}"/>
      <stop offset="1" stop-color="#0b1120"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="${OG_WIDTH - 60}" cy="40" r="260" fill="#ffffff" fill-opacity="0.06"/>
  <text x="${PAD}" y="${PAD + 24}" font-family="${FONT}" font-size="30" font-weight="600" fill="#ffffff" fill-opacity="0.85">${xml(siteName)}</text>
  <text font-family="${FONT}" font-size="${size}" font-weight="700" fill="#ffffff">${tspans}</text>
  <rect x="${PAD}" y="${OG_HEIGHT - PAD - 6}" width="64" height="6" rx="3" fill="#ffffff" fill-opacity="0.9"/>
  ${author ? `<text x="${PAD + 84}" y="${OG_HEIGHT - PAD + 2}" font-family="${FONT}" font-size="28" fill="#ffffff" fill-opacity="0.85">${xml(author)}</text>` : ''}
</svg>`;
  }
}
