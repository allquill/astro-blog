import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min,
  ValidateIf, ValidateNested,
} from 'class-validator';
import { PageQuery } from '../common/dto';
import { ACCENTS, CONTENT_ICONS, SITE_SHARE_NETWORKS, SLUG, SLUG_MESSAGE, SOCIAL_NETWORKS, BRAND_COLORS } from './content.constants';
import { Author, Media, Page, Post, POST_STATUSES, SocialLink, Topic } from './content.entities';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const optionalUrl = { require_protocol: true, require_tld: false };

// ------------------------------------------------------------------------------------- shared

export class SocialLinkInput {
  @ApiProperty({ enum: SOCIAL_NETWORKS }) @IsIn(SOCIAL_NETWORKS)
  network: string;

  @ApiProperty() @Transform(trim) @IsUrl(optionalUrl, { message: 'Use a full URL like https://…' }) @MaxLength(500)
  url: string;
}

export class NavLinkDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(60)
  label: string;

  @ApiProperty({ description: '/about or https://…' }) @Transform(trim) @IsString() @Matches(/^(\/|https?:\/\/|mailto:)/, { message: 'Use /path or a full URL' }) @MaxLength(500)
  href: string;
}

export class BodyProblemDto {
  @ApiProperty({ nullable: true, type: Number }) line: number | null;
  @ApiProperty() message: string;
}

// -------------------------------------------------------------------------------------- posts

export class PostInputDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty({ message: 'A title is required' }) @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Defaults to the title, slugified. Locked once the post has been published.' })
  @IsOptional() @Transform(trim) @Matches(SLUG, { message: SLUG_MESSAGE })
  slug?: string;

  @ApiProperty() @IsString() @MaxLength(1000)
  excerpt: string;

  @ApiProperty({ description: 'Markdoc' }) @IsString() @MaxLength(500_000)
  body: string;

  @ApiProperty({ nullable: true, type: String, description: 'ISO date or date-time; required to publish' })
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsISO8601({}, { message: 'Use a date like 2026-11-03' })
  publishedDate: string | null;

  @ApiProperty({ nullable: true, type: String }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsISO8601({}, { message: 'Use a date like 2026-11-03' })
  updatedDate: string | null;

  @ApiProperty({ description: 'Author slug' }) @IsString() @MaxLength(120)
  author: string;

  @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(20) @IsString({ each: true })
  topics: string[];

  @ApiProperty({ type: [String] }) @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(60, { each: true })
  tags: string[];

  @ApiProperty({ nullable: true, type: String, description: 'Media id' }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsString()
  coverId: string | null;

  @ApiProperty() @IsString() @MaxLength(300)
  coverAlt: string;

  @ApiProperty() @Transform(trim) @IsString() @MaxLength(120)
  series: string;

  @ApiProperty() @IsBoolean()
  featured: boolean;

  @ApiProperty({ description: 'Empty, or the original URL when the post was first published elsewhere' })
  @Transform(trim) @ValidateIf((_, v) => v !== '') @IsUrl(optionalUrl, { message: 'Use a full URL like https://…' }) @MaxLength(500)
  canonicalUrl: string;

  @ApiProperty({ description: 'Empty, or an https link to the code behind the post (e.g. a GitHub repository)' })
  @Transform(trim) @ValidateIf((_, v) => v !== '')
  @IsUrl({ require_protocol: true, protocols: ['https'] }, { message: 'Use a full https:// link' }) @MaxLength(500)
  repositoryUrl: string;

  @ApiPropertyOptional({ description: 'Empty, or the title for search results and share cards (about 60 characters)' })
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120)
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'Empty, or the description for search results and share cards (about 155 characters)' })
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300)
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'Keep the post out of search engines and the sitemap' }) @IsOptional() @IsBoolean()
  noindex?: boolean;
}

export class PostListQuery extends PageQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: [...POST_STATUSES, 'scheduled'] }) @IsOptional() @IsIn([...POST_STATUSES, 'scheduled'])
  status?: string;
}

export class PostSummaryDto {
  @ApiProperty() id: number;
  @ApiProperty() slug: string;
  @ApiProperty() title: string;
  @ApiProperty({ enum: [...POST_STATUSES, 'scheduled'], description: 'scheduled = published with a future date' }) status: string;
  @ApiProperty({ nullable: true, type: Number }) publishedDate: number | null;
  @ApiProperty() author: string;
  @ApiProperty({ type: [String] }) topics: string[];
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty({ nullable: true, type: String }) coverId: string | null;
  @ApiProperty() featured: boolean;
  @ApiProperty() slugLocked: boolean;
  @ApiProperty() url: string;
  @ApiProperty() updatedAt: Date;
  @ApiProperty() updatedBy: string;
  @ApiProperty() likes: number;
  @ApiProperty() shares: number;
  @ApiProperty() messages: number;
}

export class PostListDto {
  @ApiProperty({ type: [PostSummaryDto] }) data: PostSummaryDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
}

export class PostDetailDto extends Post {
  @ApiProperty() slugLocked: boolean;
  @ApiProperty() url: string;
  @ApiProperty({ nullable: true, type: Media }) cover: Media | null;
}

export class PreviewLinkDto {
  @ApiProperty() url: string;
  @ApiProperty({ description: 'Epoch ms' }) expiresAt: number;
}

export class ValidateBodyDto {
  @ApiProperty() @IsString() @MaxLength(500_000)
  body: string;
}

export class ValidateBodyResultDto {
  @ApiProperty({ type: [BodyProblemDto] }) problems: BodyProblemDto[];
}

// ------------------------------------------------------------------------- topics / authors / pages

export class TopicInputDto {
  @ApiProperty() @Transform(trim) @Matches(SLUG, { message: SLUG_MESSAGE })
  slug: string;

  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty({ message: 'A name is required' }) @MaxLength(120)
  name: string;

  @ApiProperty() @IsString() @MaxLength(500)
  description: string;

  @ApiProperty({ enum: CONTENT_ICONS }) @IsIn(CONTENT_ICONS)
  icon: string;

  @ApiProperty({ enum: ACCENTS }) @IsIn(ACCENTS)
  accent: string;

  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) @Max(1000)
  sortOrder: number;
}

export class TopicDto extends Topic {
  @ApiProperty() posts: number;
}

export class AuthorInputDto {
  @ApiProperty() @Transform(trim) @Matches(SLUG, { message: SLUG_MESSAGE })
  slug: string;

  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty({ message: 'A name is required' }) @MaxLength(120)
  name: string;

  @ApiProperty() @Transform(trim) @IsString() @MaxLength(120)
  role: string;

  @ApiProperty() @IsString() @MaxLength(2000)
  bio: string;

  @ApiProperty({ nullable: true, type: String }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsString()
  avatarId: string | null;

  @ApiProperty({ type: [SocialLinkInput] }) @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => SocialLinkInput)
  links: SocialLinkInput[];
}

export class AuthorDto extends Author {
  @ApiProperty() posts: number;
}

export class PageInputDto {
  @ApiProperty() @Transform(trim) @Matches(SLUG, { message: SLUG_MESSAGE })
  slug: string;

  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty({ message: 'A title is required' }) @MaxLength(200)
  title: string;

  @ApiProperty() @IsString() @MaxLength(500)
  description: string;

  @ApiProperty({ description: 'Markdoc' }) @IsString() @MaxLength(500_000)
  body: string;

  @ApiProperty({ nullable: true, type: String }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsISO8601({}, { message: 'Use a date like 2026-11-03' })
  updatedDate: string | null;

  @ApiProperty() @IsBoolean()
  showInHeader: boolean;

  @ApiProperty() @IsBoolean()
  showInFooter: boolean;
}

export class PageDto extends Page {
  @ApiProperty({ description: 'The page on the site' }) url: string;
}

// ------------------------------------------------------------------------------- site settings

export class SiteSettingsDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty({ message: 'A blog name is required' }) @MaxLength(120)
  siteName: string;

  @ApiProperty() @IsString() @MaxLength(200)
  tagline: string;

  @ApiProperty({ description: 'Meta description of the home page' }) @IsString() @MaxLength(500)
  description: string;

  @ApiProperty({ description: 'Organisation named as publisher in structured data' }) @IsString() @MaxLength(120)
  publisher: string;

  @ApiProperty() @IsString() @MaxLength(254)
  email: string;

  @ApiProperty({ type: [SocialLinkInput] }) @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => SocialLinkInput)
  social: SocialLinkInput[];

  @ApiProperty({ type: [NavLinkDto] }) @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => NavLinkDto)
  nav: NavLinkDto[];

  @ApiProperty({ type: [NavLinkDto] }) @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => NavLinkDto)
  footerLinks: NavLinkDto[];

  @ApiProperty({ type: [String], enum: SITE_SHARE_NETWORKS }) @IsArray() @IsIn(SITE_SHARE_NETWORKS, { each: true })
  shareNetworks: string[];

  @ApiProperty() @IsString() @MaxLength(120)
  subscribeTitle: string;

  @ApiProperty() @IsString() @MaxLength(500)
  subscribeText: string;

  @ApiProperty() @Type(() => Number) @IsInt() @Min(3) @Max(48)
  postsPerPage: number;

  @ApiProperty({ description: 'IndexNow key: 8–128 letters, digits or dashes, or empty' })
  @Matches(/^([A-Za-z0-9-]{8,128})?$/, { message: 'IndexNow key: 8–128 letters, digits or dashes' })
  indexNowKey: string;

  // Public by nature (each search engine reads it from the home page's <meta>), so fine in the snapshot.
  @ApiPropertyOptional({ description: 'Google Search Console verification: the content of its google-site-verification meta tag, or empty' })
  @IsOptional() @Transform(trim) @Matches(/^([A-Za-z0-9_-]{8,100})?$/, { message: 'Paste only the content="…" value (letters, digits, - and _)' })
  googleSiteVerification?: string;

  @ApiPropertyOptional({ description: 'Bing Webmaster Tools verification: the content of its msvalidate.01 meta tag, or empty' })
  @IsOptional() @Transform(trim) @Matches(/^([A-Za-z0-9_-]{8,100})?$/, { message: 'Paste only the content="…" value (letters, digits, - and _)' })
  bingSiteVerification?: string;

  @ApiProperty({ enum: BRAND_COLORS, description: 'Brand colour of the site and its e-mails: a Tailwind colour family' })
  @IsIn(BRAND_COLORS, { message: 'Pick one of the brand colours' })
  brandColor: string;
}

export class HomeDto {
  @ApiProperty() @IsString() @MaxLength(80)
  eyebrow: string;

  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty({ message: 'A headline is required' }) @MaxLength(200)
  heroTitle: string;

  @ApiProperty() @IsString() @MaxLength(500)
  heroSubtitle: string;

  @ApiProperty() @IsString() @MaxLength(80)
  latestTitle: string;

  @ApiProperty() @IsString() @MaxLength(80)
  topicsTitle: string;
}

// ------------------------------------------------------------------------------------- media

export class MediaListQuery extends PageQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  q?: string;
}

export class MediaItemDto extends Media {
  @ApiProperty({ description: 'Root-relative URL of the original' }) url: string;
}

export class MediaListDto {
  @ApiProperty({ type: [MediaItemDto] }) data: MediaItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
}

export class MediaAltDto {
  @ApiProperty() @IsString() @MaxLength(300)
  alt: string;
}

export class MediaUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' }) file: unknown;
  @ApiPropertyOptional() alt?: string;
}

export class MediaUsageDto {
  @ApiProperty({ type: [String], description: 'post:<slug>, author:<slug>, page:<slug>' }) usedBy: string[];
}

// --------------------------------------------------------------------------------- code fetch

export class FetchCodeDto {
  @ApiProperty({ description: 'https URL of a file: a GitHub/GitLab/Bitbucket file page (with optional #L10-L20) or a raw file' })
  @Transform(trim) @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'Use an https:// link' }) @MaxLength(1000)
  url: string;
}

export class FetchedCodeDto {
  @ApiProperty() content: string;
  @ApiProperty({ description: 'Guessed from the file extension; empty when unknown' }) language: string;
  @ApiProperty({ description: 'File name, for the code block title' }) title: string;
  @ApiProperty({ description: 'The link to show as "View source"' }) source: string;
  @ApiProperty({ nullable: true, type: Number }) fromLine: number | null;
  @ApiProperty({ nullable: true, type: Number }) toLine: number | null;
}

// ----------------------------------------------------------------------------- public (website)

export class PublicImageDto {
  @ApiProperty() id: string;
  @ApiProperty() width: number;
  @ApiProperty() height: number;
  @ApiProperty() alt: string;
}

export class PublicPostDto {
  @ApiProperty() slug: string;
  @ApiProperty() title: string;
  @ApiProperty() excerpt: string;
  @ApiProperty({ description: 'Markdoc' }) body: string;
  @ApiProperty() publishedDate: string;
  @ApiProperty({ nullable: true, type: String }) updatedDate: string | null;
  @ApiProperty() author: string;
  @ApiProperty({ type: [String] }) topics: string[];
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty({ nullable: true, type: PublicImageDto }) cover: PublicImageDto | null;
  @ApiProperty() coverAlt: string;
  @ApiProperty() series: string;
  @ApiProperty() featured: boolean;
  @ApiProperty({ nullable: true, type: String }) canonicalUrl: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Link to the code behind the post' }) repositoryUrl: string | null;
  @ApiProperty({ description: 'Empty, or the title for <title> and share cards' }) seoTitle: string;
  @ApiProperty({ description: 'Empty, or the meta and share description' }) seoDescription: string;
  @ApiProperty({ description: 'Keep out of search engines and the sitemap' }) noindex: boolean;
  @ApiProperty({ description: 'Only true in a preview' }) draft: boolean;
  @ApiProperty({ description: 'Changes on every edit (render cache key)' }) revision: string;
}

export class PublicTopicDto {
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty() icon: string;
  @ApiProperty() accent: string;
  @ApiProperty() order: number;
}

export class PublicAuthorDto {
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty() role: string;
  @ApiProperty() bio: string;
  @ApiProperty({ nullable: true, type: PublicImageDto }) avatar: PublicImageDto | null;
  @ApiProperty({ type: [SocialLink] }) links: SocialLink[];
}

export class PublicPageDto {
  @ApiProperty() slug: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() body: string;
  @ApiProperty({ nullable: true, type: String }) updatedDate: string | null;
  @ApiProperty() showInHeader: boolean;
  @ApiProperty() showInFooter: boolean;
  @ApiProperty() revision: string;
}

export class ContentSnapshotDto {
  @ApiProperty({ description: 'Same value as GET /api/public/content/version while nothing has changed' }) version: string;
  @ApiProperty({ type: [PublicPostDto], description: 'Published posts whose date has come, newest first' }) posts: PublicPostDto[];
  @ApiProperty({ type: [PublicTopicDto] }) topics: PublicTopicDto[];
  @ApiProperty({ type: [PublicAuthorDto] }) authors: PublicAuthorDto[];
  @ApiProperty({ type: [PublicPageDto] }) pages: PublicPageDto[];
  @ApiProperty({ type: SiteSettingsDto }) site: SiteSettingsDto;
  @ApiProperty({ type: HomeDto }) home: HomeDto;
}

export class ContentVersionDto {
  @ApiProperty() version: string;
}

export class PreviewQuery {
  @ApiProperty() @IsString() @MaxLength(200)
  token: string;
}

export class PreviewDto {
  @ApiProperty({ type: PublicPostDto }) post: PublicPostDto;
}
