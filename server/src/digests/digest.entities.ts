import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { asNumber } from '../common/columns';

export const DIGEST_STATUSES = ['draft', 'sending', 'sent', 'failed'] as const;
export type DigestStatus = (typeof DIGEST_STATUSES)[number];
export const DELIVERY_STATUSES = ['pending', 'sent', 'failed'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/** A new-post e-mail to the mailing list. The post itself is read from the site feed by slug. */
@Entity('digests')
export class Digest {
  @ApiProperty() @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty() @Column({ name: 'post_slug', type: 'varchar', length: 120 })
  postSlug: string;

  @ApiProperty() @Column({ type: 'varchar', length: 200 })
  subject: string;

  /** A short note from the author, above the post card. */
  @ApiProperty() @Column({ type: 'text', default: '' })
  intro: string;

  /**
   * Snapshot of the post (title, url, summary, image, topics) taken when sending starts, so a digest
   * that is resumed after a restart sends the same thing.
   */
  @Column({ name: 'post_snapshot', type: 'text', default: '' })
  postSnapshot: string;

  @ApiProperty({ enum: DIGEST_STATUSES }) @Column({ type: 'varchar', length: 10, default: 'draft' })
  status: DigestStatus;

  @ApiProperty() @Column({ type: 'integer', default: 0 })
  recipients: number;

  @ApiProperty() @Column({ name: 'sent_count', type: 'integer', default: 0 })
  sentCount: number;

  @ApiProperty() @Column({ name: 'failed_count', type: 'integer', default: 0 })
  failedCount: number;

  @ApiProperty() @Column({ name: 'created_by', type: 'varchar', length: 120, default: '' })
  createdBy: string;

  @ApiProperty({ nullable: true, type: Number }) @Column({ name: 'started_at', type: 'bigint', nullable: true, transformer: asNumber })
  startedAt: number | null;

  @ApiProperty({ nullable: true, type: Number }) @Column({ name: 'finished_at', type: 'bigint', nullable: true, transformer: asNumber })
  finishedAt: number | null;

  @ApiProperty() @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** One recipient of one digest; the send loop works through the pending ones. */
@Entity('digest_deliveries')
@Index('digest_deliveries_digest_subscriber', ['digestId', 'subscriberId'], { unique: true })
@Index('digest_deliveries_digest_status', ['digestId', 'status'])
export class DigestDelivery {
  @ApiProperty() @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty() @Column({ name: 'digest_id', type: 'integer' })
  digestId: number;

  @ManyToOne(() => Digest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'digest_id' })
  digest?: Digest;

  @ApiProperty() @Column({ name: 'subscriber_id', type: 'integer' })
  subscriberId: number;

  @ApiProperty() @Column({ type: 'varchar', length: 254 })
  email: string;

  @ApiProperty({ enum: DELIVERY_STATUSES }) @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: DeliveryStatus;

  @ApiProperty() @Column({ type: 'text', default: '' })
  error: string;

  @ApiProperty({ nullable: true, type: Number }) @Column({ name: 'sent_at', type: 'bigint', nullable: true, transformer: asNumber })
  sentAt: number | null;
}
