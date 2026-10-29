import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { asNumber } from '../common/columns';

export const SUBSCRIBER_STATUSES = ['pending', 'active', 'unsubscribed', 'bounced'] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number];

/**
 * A mailing-list address. Double opt-in: `pending` until the confirm link is used. `topics` empty means
 * every topic. Links in e-mails are HMACs over the id and `accessKey` (common/links.ts).
 */
@Entity('subscribers')
@Index('subscribers_status', ['status'])
export class Subscriber {
  @ApiProperty() @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty() @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  @ApiProperty() @Column({ type: 'varchar', length: 120, default: '' })
  name: string;

  @ApiProperty({ enum: SUBSCRIBER_STATUSES }) @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: SubscriberStatus;

  /** JSON array of topic slugs; [] = all topics. */
  @Column({ type: 'text', default: '[]' })
  topics: string;

  @Column({ name: 'access_key', type: 'varchar', length: 64, select: false })
  accessKey: string;

  /** Where the sign-up came from: a page path, "import" or "admin". */
  @ApiProperty() @Column({ type: 'varchar', length: 120, default: '' })
  source: string;

  @Column({ name: 'ip_hash', type: 'varchar', length: 16, default: '' })
  ipHash: string;

  @ApiProperty({ nullable: true, type: Number }) @Column({ name: 'confirm_sent_at', type: 'bigint', nullable: true, transformer: asNumber })
  confirmSentAt: number | null;

  @ApiProperty({ nullable: true, type: Number }) @Column({ name: 'confirmed_at', type: 'bigint', nullable: true, transformer: asNumber })
  confirmedAt: number | null;

  @ApiProperty({ nullable: true, type: Number }) @Column({ name: 'unsubscribed_at', type: 'bigint', nullable: true, transformer: asNumber })
  unsubscribedAt: number | null;

  @ApiProperty() @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export const topicList = (s: Pick<Subscriber, 'topics'>) => JSON.parse(s.topics || '[]') as string[];
