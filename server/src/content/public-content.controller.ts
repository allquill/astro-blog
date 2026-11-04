import { Controller, Get, Header, NotFoundException, Param, Query, Res, UseFilters } from '@nestjs/common';
import { ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PublicExceptionFilter } from '../common/public-exception.filter';
import { ContentSnapshotDto, ContentVersionDto, PreviewDto, PreviewQuery } from './content.dto';
import { ContentService } from './content.service';
import { MediaService, VARIANT_FORMATS, type VariantFormat } from './media.service';
import { OgImageService } from './og-image.service';

/**
 * What the website renders from. It fetches the snapshot once, then polls `version` (a few bytes)
 * and refetches only when it changes, so a published post shows within seconds.
 */
@ApiTags('public')
@Controller('api/public/content')
@UseFilters(PublicExceptionFilter)
export class PublicContentController {
  constructor(private readonly content: ContentService) {}

  @Get('version')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: ContentVersionDto })
  async version(): Promise<ContentVersionDto> {
    return { version: await this.content.version() };
  }

  @Get('snapshot')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: ContentSnapshotDto })
  snapshot() {
    return this.content.snapshot();
  }

  /** A post as it currently is, drafts included, for a signed preview link from the admin. */
  @Get('preview/:slug')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: PreviewDto })
  preview(@Param('slug') slug: string, @Query() q: PreviewQuery) {
    return this.content.preview(slug, q.token);
  }
}

/**
 * Generated share cards (1200×630 PNG) for posts without a cover: /api/public/og/<slug>/<key>.png.
 * The key only busts caches (the website derives it from the post's revision and the site settings);
 * the card always shows the post as it is now.
 */
@ApiTags('public')
@Controller('api/public/og')
@UseFilters(PublicExceptionFilter)
export class PublicOgImageController {
  constructor(private readonly og: OgImageService) {}

  @Get(':slug/:file')
  @ApiProduces('image/png')
  @ApiOkResponse({ description: 'The share card of a published post', schema: { type: 'string', format: 'binary' } })
  async card(@Param('slug') slug: string, @Param('file') file: string, @Res() res: Response) {
    if (!/^[\w.-]{1,100}\.png$/.test(file)) throw new NotFoundException();
    const png = await this.og.postCard(slug);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(png);
  }
}

/** Uploaded images: the original, or a resized copy at /<id>/<width>.<webp|jpg>. Cached for a year. */
@ApiTags('public')
@Controller('api/public/media')
@UseFilters(PublicExceptionFilter)
export class PublicMediaController {
  constructor(private readonly media: MediaService) {}

  @Get(':id')
  @ApiProduces('image/*')
  @ApiOkResponse({ description: 'The uploaded image', schema: { type: 'string', format: 'binary' } })
  async original(@Param('id') id: string, @Res() res: Response) {
    const { path, media } = await this.media.original(id);
    this.send(res, path, media.mime);
  }

  @Get(':id/:file')
  @ApiProduces('image/webp', 'image/jpeg')
  @ApiOkResponse({ description: 'A resized copy, e.g. 1280.webp (widths 320, 640, 960, 1280, 1920)', schema: { type: 'string', format: 'binary' } })
  async variant(@Param('id') id: string, @Param('file') file: string, @Res() res: Response) {
    const m = /^(\d{3,4})\.(webp|jpg)$/.exec(file);
    if (!m) return res.status(404).json({ ok: false, error: 'Not found' });
    const format = m[2] as VariantFormat;
    const { path } = await this.media.variant(id, Number(m[1]), format);
    this.send(res, path, VARIANT_FORMATS[format]);
  }

  private send(res: Response, path: string, type: string) {
    res.setHeader('Content-Type', type);
    // The id changes with every upload, so a URL's bytes never change.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
    res.sendFile(path, { dotfiles: 'deny', headers: { 'Content-Type': type } });
  }
}
