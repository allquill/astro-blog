import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Network names a share click may report (the site's ShareBar uses the same list). */
export const SHARE_NETWORKS = ['x', 'linkedin', 'facebook', 'reddit', 'hackernews', 'bluesky', 'mastodon', 'whatsapp', 'email', 'copy', 'native'] as const;
export type ShareNetwork = (typeof SHARE_NETWORKS)[number];

/** Counters for one post, keyed by its Keystatic slug. Posts themselves live in the website's content files. */
@Entity('post_stats')
export class PostStat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  /** Kept equal to the number of post_likes rows for the slug. */
  @Column({ type: 'integer', default: 0 })
  likes: number;

  @Column({ type: 'integer', default: 0 })
  shares: number;

  /** JSON object network → count. */
  @Column({ name: 'shares_by_network', type: 'text', default: '{}' })
  sharesByNetwork: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** One reader's like, so it can be undone and counted once. The visitor is a salted hash, never an IP. */
@Entity('post_likes')
@Index('post_likes_slug_visitor', ['slug', 'visitorHash'], { unique: true })
export class PostLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  slug: string;

  @Column({ name: 'visitor_hash', type: 'varchar', length: 32 })
  visitorHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
