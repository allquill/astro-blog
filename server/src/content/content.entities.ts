import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { asNumber, jsonText } from '../common/columns';

// The blog's content: posts, topics, authors, pages and uploaded media. The website renders these
// through /api/public/content (server-side, per request); nothing is built from files any more.
// Slugs are the join key with post_stats, feedback.post_slug, subscribers.topics and digests, so a
// post's slug is locked once it has been published (ContentService).

export const POST_STATUSES = ['draft', 'published'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export class SocialLink {
  @ApiProperty() network: string;
  @ApiProperty() url: string;
}

@Entity('posts')
@Index('posts_status_published', ['status', 'publishedDate'])
export class Post {
  @ApiProperty() @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty() @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @ApiProperty() @Column({ type: 'varchar', length: 200 })
  title: string;

  @ApiProperty() @Column({ type: 'text', default: '' })
  excerpt: string;

  /** Markdoc source (Markdown plus the site's {% video %}, {% callout %}, … tags). */
  @ApiProperty() @Column({ type: 'text', default: '' })
  body: string;

  @ApiProperty({ enum: POST_STATUSES }) @Column({ type: 'varchar', length: 10, default: 'draft' })
  status: PostStatus;

  /** Date shown on the post (epoch ms). A published post with a future date appears on that date. */
  @ApiProperty({ nullable: true, type: Number }) @Column({ name: 'published_date', type: 'bigint', nullable: true, transformer: asNumber })
  publishedDate: number | null;

  /** "Updated" date shown on the post (epoch ms), set by the author. */
  @ApiProperty({ nullable: true, type: Number }) @Column({ name: 'updated_date', type: 'bigint', nullable: true, transformer: asNumber })
  updatedDate: number | null;

  /** When the post was first published; from then on its slug can't change. */
  @ApiProperty({ nullable: true, type: Number }) @Column({ name: 'first_published_at', type: 'bigint', nullable: true, transformer: asNumber })
  firstPublishedAt: number | null;

  @ApiProperty() @Column({ name: 'author_slug', type: 'varchar', length: 120, default: '' })
  authorSlug: string;

  @ApiProperty({ type: [String] }) @Column({ type: 'text', default: '[]', transformer: jsonText<string[]>([]) })
  topics: string[];

  @ApiProperty({ type: [String] }) @Column({ type: 'text', default: '[]', transformer: jsonText<string[]>([]) })
  tags: string[];

  @ApiProperty({ nullable: true, type: String }) @Column({ name: 'cover_id', type: 'varchar', length: 36, nullable: true })
  coverId: string | null;

  @ApiProperty() @Column({ name: 'cover_alt', type: 'varchar', length: 300, default: '' })
  coverAlt: string;

  @ApiProperty() @Column({ type: 'varchar', length: 120, default: '' })
  series: string;

  @ApiProperty() @Column({ type: 'boolean', default: false })
  featured: boolean;

  @ApiProperty() @Column({ name: 'canonical_url', type: 'varchar', length: 500, default: '' })
  canonicalUrl: string;

  @ApiProperty({ description: 'Empty, or an https link to the code behind the post (e.g. a GitHub repository)' })
  @Column({ name: 'repository_url', type: 'varchar', length: 500, default: '' })
  repositoryUrl: string;

  @ApiProperty() @Column({ name: 'updated_by', type: 'varchar', length: 120, default: '' })
  updatedBy: string;

  @ApiProperty() @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('topics')
export class Topic {
  @ApiProperty() @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty() @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @ApiProperty() @Column({ type: 'varchar', length: 120 })
  name: string;

  @ApiProperty() @Column({ type: 'text', default: '' })
  description: string;

  @ApiProperty() @Column({ type: 'varchar', length: 30, default: 'book' })
  icon: string;

  @ApiProperty() @Column({ type: 'varchar', length: 20, default: 'teal' })
  accent: string;

  /** Lower first. */
  @ApiProperty() @Column({ name: 'sort_order', type: 'integer', default: 10 })
  sortOrder: number;

  @ApiProperty() @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('authors')
export class Author {
  @ApiProperty() @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty() @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @ApiProperty() @Column({ type: 'varchar', length: 120 })
  name: string;

  @ApiProperty() @Column({ type: 'varchar', length: 120, default: '' })
  role: string;

  @ApiProperty() @Column({ type: 'text', default: '' })
  bio: string;

  @ApiProperty({ nullable: true, type: String }) @Column({ name: 'avatar_id', type: 'varchar', length: 36, nullable: true })
  avatarId: string | null;

  @ApiProperty({ type: [SocialLink] }) @Column({ type: 'text', default: '[]', transformer: jsonText<SocialLink[]>([]) })
  links: SocialLink[];

  @ApiProperty() @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** Stand-alone pages (about, privacy, terms), served at /<slug>/. Always public once saved. */
@Entity('pages')
export class Page {
  @ApiProperty() @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty() @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @ApiProperty() @Column({ type: 'varchar', length: 200 })
  title: string;

  @ApiProperty() @Column({ type: 'text', default: '' })
  description: string;

  @ApiProperty() @Column({ type: 'text', default: '' })
  body: string;

  @ApiProperty({ nullable: true, type: Number }) @Column({ name: 'updated_date', type: 'bigint', nullable: true, transformer: asNumber })
  updatedDate: number | null;

  @ApiProperty() @Column({ name: 'show_in_header', type: 'boolean', default: false })
  showInHeader: boolean;

  @ApiProperty() @Column({ name: 'show_in_footer', type: 'boolean', default: true })
  showInFooter: boolean;

  @ApiProperty() @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** An uploaded image. The file is <MEDIA_DIR>/<id>.<ext>; resized copies are cached beside it. */
@Entity('media')
export class Media {
  @ApiProperty() @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @ApiProperty() @Column({ name: 'file_name', type: 'varchar', length: 200 })
  fileName: string;

  @ApiProperty() @Column({ type: 'varchar', length: 40 })
  mime: string;

  @ApiProperty() @Column({ type: 'integer', default: 0 })
  width: number;

  @ApiProperty() @Column({ type: 'integer', default: 0 })
  height: number;

  @ApiProperty() @Column({ type: 'integer', default: 0 })
  bytes: number;

  @ApiProperty() @Column({ type: 'varchar', length: 300, default: '' })
  alt: string;

  @ApiProperty() @Column({ name: 'created_by', type: 'varchar', length: 120, default: '' })
  createdBy: string;

  @ApiProperty() @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

