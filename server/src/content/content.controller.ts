import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req, Res, StreamableFile, UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiProduces, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { Staff, type AdminRequest } from '../auth/guards';
import { OkDto } from '../common/dto';
import { CodeFetchService } from './code-fetch.service';
import {
  AuthorDto, AuthorInputDto, FetchCodeDto, FetchedCodeDto, HomeDto, MediaAltDto, MediaItemDto, MediaListDto, MediaListQuery, MediaUploadDto,
  MediaUsageDto, PageDto, PageInputDto, PostDetailDto, PostInputDto, PostListDto, PostListQuery, PreviewLinkDto, SiteSettingsDto, TopicDto, TopicInputDto,
  ValidateBodyDto, ValidateBodyResultDto,
} from './content.dto';
import { Author, Media, Topic } from './content.entities';
import { ContentService } from './content.service';
import { validateBody } from './markdoc-schema';
import { MediaService, mediaPath } from './media.service';
import { SiteContentService } from './site-content.service';
import { IMPORT_LIMITS, TransferService, type ImportKind } from './transfer/transfer.service';

const by = (req: AdminRequest) => req.user?.username ?? '';
const withUrl = (m: Media): MediaItemDto => ({ ...m, url: mediaPath(m.id) });
const toBool = ({ value }: { value: unknown }) => (value === undefined || value === '' ? undefined : ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase()));

const EXPORT_KINDS = ['posts', 'topics', 'authors', 'pages', 'settings'] as const;

/** Export kinds as the transfer service names them. */
function exportKinds(wanted: string[]): ImportKind[] {
  const include: ImportKind[] = [];
  if (wanted.includes('posts')) include.push('post');
  if (wanted.includes('topics')) include.push('topic');
  if (wanted.includes('authors')) include.push('author');
  if (wanted.includes('pages')) include.push('page');
  if (wanted.includes('settings')) include.push('site', 'home');
  return include;
}

export class ExportQuery {
  @ApiPropertyOptional({ description: `Comma-separated: ${EXPORT_KINDS.join(', ')} (default all)` })
  @IsOptional()
  include?: string;

  @ApiPropertyOptional({ enum: ['all', 'published'], default: 'all' }) @IsOptional() @IsIn(['all', 'published'])
  status?: 'all' | 'published';
}

export class ImportQuery {
  @ApiPropertyOptional({ default: true, description: 'Only check and report; change nothing' })
  @IsOptional() @Transform(toBool) @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({ enum: ['skip', 'overwrite'], default: 'skip' }) @IsOptional() @IsIn(['skip', 'overwrite'])
  onConflict?: 'skip' | 'overwrite';

  @ApiPropertyOptional({ default: false, description: 'Import every post as a draft' })
  @IsOptional() @Transform(toBool) @IsBoolean()
  asDraft?: boolean;
}

export class ContentImportUploadDto {
  @ApiProperty({ type: 'string', format: 'binary', description: '.zip export or a single .md' }) file: unknown;

  @ApiPropertyOptional({ description: 'JSON array of the archive paths (`source` from a dry run) to import; leave it out to import everything' })
  @IsOptional() @IsString()
  only?: string;
}

/** The `only` field of an import: a JSON array of archive paths, or undefined. */
function parseOnly(raw: string | undefined): string[] | undefined {
  if (raw === undefined || raw === '') return undefined;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    throw new BadRequestException('The selection is not valid.');
  }
  if (!Array.isArray(v) || v.length > IMPORT_LIMITS.entries || !v.every((p) => typeof p === 'string' && p.length <= 500)) {
    throw new BadRequestException('The selection is not valid.');
  }
  if (!v.length) throw new BadRequestException('Select at least one item to import.');
  return v as string[];
}

const SLUG_LIST = () => [IsOptional(), IsArray(), ArrayMaxSize(5000), IsString({ each: true }), MaxLength(200, { each: true })];
const apply = (...ds: PropertyDecorator[]): PropertyDecorator => (target, key) => ds.forEach((d) => d(target, key));

export class ExportRequestDto {
  @ApiPropertyOptional({ type: [String], enum: EXPORT_KINDS, description: 'Kinds to export (default all)' })
  @IsOptional() @IsArray() @IsIn(EXPORT_KINDS, { each: true })
  include?: string[];

  @ApiPropertyOptional({ enum: ['all', 'published'], default: 'all' }) @IsOptional() @IsIn(['all', 'published'])
  status?: 'all' | 'published';

  @ApiPropertyOptional({ type: [String], description: 'Only these post slugs (leave out for all)' }) @apply(...SLUG_LIST())
  posts?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Only these page slugs (leave out for all)' }) @apply(...SLUG_LIST())
  pages?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Only these topic slugs (leave out for all)' }) @apply(...SLUG_LIST())
  topics?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Only these author slugs (leave out for all)' }) @apply(...SLUG_LIST())
  authors?: string[];

  @ApiPropertyOptional({ default: true, description: 'Also export the topics and authors the exported posts use' })
  @IsOptional() @IsBoolean()
  withDependencies?: boolean;
}

class ExportPostItemDto {
  @ApiProperty() slug: string;
  @ApiProperty() title: string;
  @ApiProperty({ enum: ['draft', 'published'] }) status: string;
}
class ExportPageItemDto {
  @ApiProperty() slug: string;
  @ApiProperty() title: string;
}
class ExportNamedItemDto {
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
}
export class ExportCatalogDto {
  @ApiProperty({ type: [ExportPostItemDto] }) posts: ExportPostItemDto[];
  @ApiProperty({ type: [ExportPageItemDto] }) pages: ExportPageItemDto[];
  @ApiProperty({ type: [ExportNamedItemDto] }) topics: ExportNamedItemDto[];
  @ApiProperty({ type: [ExportNamedItemDto] }) authors: ExportNamedItemDto[];
}

export class ContentImportItemDto {
  @ApiProperty({ enum: ['topic', 'author', 'post', 'page', 'site', 'home'] }) kind: string;
  @ApiProperty() slug: string;
  @ApiProperty({ description: 'Path inside the archive' }) source: string;
  @ApiProperty({ enum: ['create', 'update', 'skip', 'error'] }) action: string;
  @ApiProperty({ type: [String] }) messages: string[];
  @ApiProperty({ type: [String], description: 'Items of the same archive this post needs (`topic:<slug>`, `author:<slug>`), not yet in the database' })
  needs: string[];
}

export class ContentImportResultDto {
  @ApiProperty() dryRun: boolean;
  @ApiProperty({ type: [ContentImportItemDto] }) items: ContentImportItemDto[];
}

@ApiTags('content')
@Controller('api/admin/content')
export class ContentController {
  constructor(
    private readonly content: ContentService,
    private readonly media: MediaService,
    private readonly site: SiteContentService,
    private readonly code: CodeFetchService,
    private readonly transfer: TransferService,
  ) {}

  // ------------------------------------------------------------------------------- posts

  @Get('posts')
  @Staff()
  @ApiOkResponse({ type: PostListDto })
  listPosts(@Query() q: PostListQuery) {
    return this.content.listPosts(q);
  }

  @Post('posts')
  @Staff()
  @ApiOkResponse({ type: PostDetailDto })
  createPost(@Req() req: AdminRequest, @Body() body: PostInputDto) {
    return this.content.createPost(body, by(req));
  }

  @Get('posts/:id')
  @Staff()
  @ApiOkResponse({ type: PostDetailDto })
  getPost(@Param('id', ParseIntPipe) id: number) {
    return this.content.postDetail(id);
  }

  @Put('posts/:id')
  @Staff()
  @ApiOkResponse({ type: PostDetailDto })
  updatePost(@Req() req: AdminRequest, @Param('id', ParseIntPipe) id: number, @Body() body: PostInputDto) {
    return this.content.updatePost(id, body, by(req));
  }

  @Post('posts/:id/publish')
  @HttpCode(200)
  @Staff()
  @ApiOkResponse({ type: PostDetailDto })
  publish(@Req() req: AdminRequest, @Param('id', ParseIntPipe) id: number) {
    return this.content.publish(id, by(req));
  }

  @Post('posts/:id/unpublish')
  @HttpCode(200)
  @Staff()
  @ApiOkResponse({ type: PostDetailDto })
  unpublish(@Req() req: AdminRequest, @Param('id', ParseIntPipe) id: number) {
    return this.content.unpublish(id, by(req));
  }

  @Delete('posts/:id')
  @Staff('admin')
  @ApiOkResponse({ type: OkDto })
  async removePost(@Param('id', ParseIntPipe) id: number): Promise<OkDto> {
    await this.content.removePost(id);
    return { ok: true };
  }

  @Post('posts/:id/preview-link')
  @HttpCode(200)
  @Staff()
  @ApiOkResponse({ type: PreviewLinkDto })
  previewLink(@Param('id', ParseIntPipe) id: number) {
    return this.content.previewLink(id);
  }

  @Get('posts/:id/export')
  @Staff()
  @ApiProduces('application/zip', 'text/markdown')
  @ApiOkResponse({ description: 'The post as .md (no images) or .zip (index.md + assets/)', schema: { type: 'string', format: 'binary' } })
  async exportPost(@Param('id', ParseIntPipe) id: number, @Res({ passthrough: true }) res: Response) {
    const file = await this.transfer.exportPost(id);
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return new StreamableFile(file.data);
  }

  @Post('validate-body')
  @HttpCode(200)
  @Staff()
  @ApiOkResponse({ type: ValidateBodyResultDto })
  validate(@Body() body: ValidateBodyDto): ValidateBodyResultDto {
    return { problems: validateBody(body.body) };
  }

  @Post('fetch-code')
  @HttpCode(200)
  @Staff()
  @ApiOkResponse({ type: FetchedCodeDto })
  fetchCode(@Body() body: FetchCodeDto) {
    return this.code.fetch(body.url);
  }

  // ------------------------------------------------------------------------------ topics

  @Get('topics')
  @Staff()
  @ApiOkResponse({ type: [TopicDto] })
  listTopics() {
    return this.content.listTopics();
  }

  @Post('topics')
  @Staff()
  @ApiOkResponse({ type: Topic })
  createTopic(@Body() body: TopicInputDto) {
    return this.content.createTopic(body);
  }

  @Put('topics/:id')
  @Staff()
  @ApiOkResponse({ type: Topic })
  updateTopic(@Param('id', ParseIntPipe) id: number, @Body() body: TopicInputDto) {
    return this.content.updateTopic(id, body);
  }

  @Delete('topics/:id')
  @Staff('admin')
  @ApiOkResponse({ type: OkDto })
  async removeTopic(@Param('id', ParseIntPipe) id: number): Promise<OkDto> {
    await this.content.removeTopic(id);
    return { ok: true };
  }

  // ----------------------------------------------------------------------------- authors

  @Get('authors')
  @Staff()
  @ApiOkResponse({ type: [AuthorDto] })
  listAuthors() {
    return this.content.listAuthors();
  }

  @Post('authors')
  @Staff()
  @ApiOkResponse({ type: Author })
  createAuthor(@Body() body: AuthorInputDto) {
    return this.content.createAuthor(body);
  }

  @Put('authors/:id')
  @Staff()
  @ApiOkResponse({ type: Author })
  updateAuthor(@Param('id', ParseIntPipe) id: number, @Body() body: AuthorInputDto) {
    return this.content.updateAuthor(id, body);
  }

  @Delete('authors/:id')
  @Staff('admin')
  @ApiOkResponse({ type: OkDto })
  async removeAuthor(@Param('id', ParseIntPipe) id: number): Promise<OkDto> {
    await this.content.removeAuthor(id);
    return { ok: true };
  }

  // ------------------------------------------------------------------------------- pages

  @Get('pages')
  @Staff()
  @ApiOkResponse({ type: [PageDto] })
  listPages() {
    return this.content.listPages();
  }

  @Get('pages/:id')
  @Staff()
  @ApiOkResponse({ type: PageDto })
  getPage(@Param('id', ParseIntPipe) id: number) {
    return this.content.pageDetail(id);
  }

  @Post('pages')
  @Staff()
  @ApiOkResponse({ type: PageDto })
  createPage(@Body() body: PageInputDto) {
    return this.content.savePage(null, body);
  }

  @Put('pages/:id')
  @Staff()
  @ApiOkResponse({ type: PageDto })
  updatePage(@Param('id', ParseIntPipe) id: number, @Body() body: PageInputDto) {
    return this.content.savePage(id, body);
  }

  @Delete('pages/:id')
  @Staff('admin')
  @ApiOkResponse({ type: OkDto })
  async removePage(@Param('id', ParseIntPipe) id: number): Promise<OkDto> {
    await this.content.removePage(id);
    return { ok: true };
  }

  // ------------------------------------------------------------------------ site and home

  @Get('site')
  @Staff()
  @ApiOkResponse({ type: SiteSettingsDto })
  getSite() {
    return this.site.site();
  }

  @Put('site')
  @Staff('admin')
  @ApiOkResponse({ type: SiteSettingsDto })
  async saveSite(@Body() body: SiteSettingsDto) {
    const saved = await this.site.saveSite(body);
    this.content.touch();
    return saved;
  }

  @Get('home')
  @Staff()
  @ApiOkResponse({ type: HomeDto })
  getHome() {
    return this.site.home();
  }

  @Put('home')
  @Staff('admin')
  @ApiOkResponse({ type: HomeDto })
  async saveHome(@Body() body: HomeDto) {
    const saved = await this.site.saveHome(body);
    this.content.touch();
    return saved;
  }

  // ------------------------------------------------------------------------------- media

  @Get('media')
  @Staff()
  @ApiOkResponse({ type: MediaListDto })
  async listMedia(@Query() q: MediaListQuery): Promise<MediaListDto> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 60;
    const [rows, total] = await this.media.list(q.q ?? '', page, pageSize);
    return { data: rows.map(withUrl), total, page, pageSize };
  }

  @Post('media')
  @HttpCode(200)
  @Staff()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: MediaUploadDto })
  @ApiOkResponse({ type: MediaItemDto })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } }))
  async upload(@Req() req: AdminRequest, @UploadedFile() file: Express.Multer.File | undefined, @Body('alt') alt?: string) {
    if (!file) throw new BadRequestException('Choose an image to upload.');
    return withUrl(await this.media.save(file.buffer, file.originalname, typeof alt === 'string' ? alt : '', by(req)));
  }

  @Put('media/:id')
  @Staff()
  @ApiOkResponse({ type: MediaItemDto })
  async updateMedia(@Param('id') id: string, @Body() body: MediaAltDto) {
    return withUrl(await this.media.updateAlt(id, body.alt));
  }

  @Get('media/:id/usage')
  @Staff()
  @ApiOkResponse({ type: MediaUsageDto })
  async mediaUsage(@Param('id') id: string): Promise<MediaUsageDto> {
    await this.media.get(id);
    return { usedBy: await this.media.usage(id) };
  }

  @Delete('media/:id')
  @Staff('admin')
  @ApiOkResponse({ type: OkDto })
  async removeMedia(@Param('id') id: string): Promise<OkDto> {
    await this.media.remove(id);
    return { ok: true };
  }

  // ------------------------------------------------------------------- import and export

  @Get('export')
  @Staff('admin')
  @ApiProduces('application/zip')
  @ApiOkResponse({ description: 'A .zip of Markdown files, YAML and images', schema: { type: 'string', format: 'binary' } })
  async exportAll(@Query() q: ExportQuery, @Res({ passthrough: true }) res: Response) {
    const wanted = (q.include ?? EXPORT_KINDS.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
    const bad = wanted.filter((w) => !(EXPORT_KINDS as readonly string[]).includes(w));
    if (bad.length) throw new BadRequestException(`Unknown include: ${bad.join(', ')}`);
    return this.sendExport(res, await this.transfer.exportAll({ include: exportKinds(wanted), status: q.status ?? 'all' }));
  }

  @Get('export/items')
  @Staff('admin')
  @ApiOkResponse({ type: ExportCatalogDto })
  exportItems(): Promise<ExportCatalogDto> {
    return this.transfer.exportCatalog();
  }

  /** The same export narrowed to chosen items. A POST, because a long list of slugs doesn't fit a URL. */
  @Post('export')
  @HttpCode(200)
  @Staff('admin')
  @ApiProduces('application/zip')
  @ApiOkResponse({ description: 'A .zip of Markdown files, YAML and images', schema: { type: 'string', format: 'binary' } })
  async exportSelected(@Body() dto: ExportRequestDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.transfer.exportAll({
      include: exportKinds(dto.include ?? [...EXPORT_KINDS]),
      status: dto.status ?? 'all',
      posts: dto.posts,
      pages: dto.pages,
      topics: dto.topics,
      authors: dto.authors,
      withDependencies: dto.withDependencies ?? true,
    });
    return this.sendExport(res, data);
  }

  private sendExport(res: Response, data: Buffer) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="blog-export-${new Date().toISOString().slice(0, 10)}.zip"`);
    return new StreamableFile(data);
  }

  @Post('import')
  @HttpCode(200)
  @Staff('admin')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ContentImportUploadDto })
  @ApiOkResponse({ type: ContentImportResultDto })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMPORT_LIMITS.uploadBytes, files: 1 } }))
  async import(
    @Req() req: AdminRequest,
    @Query() q: ImportQuery,
    @Body() body: ContentImportUploadDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ContentImportResultDto> {
    if (!file) throw new BadRequestException('Choose a .zip or .md file to import.');
    const dryRun = q.dryRun ?? true;
    const only = parseOnly(body.only);
    const files = this.transfer.readUpload(file.buffer, file.originalname);
    const items = await this.transfer.import(files, { dryRun, onConflict: q.onConflict ?? 'skip', asDraft: q.asDraft ?? false, by: `import:${by(req)}`, only });
    return { dryRun, items };
  }
}
