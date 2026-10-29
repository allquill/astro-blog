import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { asNumber } from '../common/columns';

export const FEEDBACK_KINDS = ['post', 'general'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_STATUSES = ['new', 'read', 'archived', 'spam'] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/** "Was this helpful?" votes and messages, from a post's footer or the /feedback/ page. */
@Entity('feedback')
@Index('feedback_status_created', ['status', 'createdAt'])
@Index('feedback_post_slug', ['postSlug'])
export class Feedback {
  @ApiProperty() @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ enum: FEEDBACK_KINDS }) @Column({ type: 'varchar', length: 10, default: 'general' })
  kind: FeedbackKind;

  @ApiProperty({ nullable: true, type: String }) @Column({ name: 'post_slug', type: 'varchar', length: 120, nullable: true })
  postSlug: string | null;

  @ApiProperty({ nullable: true, type: Boolean }) @Column({ type: 'boolean', nullable: true })
  helpful: boolean | null;

  @ApiProperty() @Column({ type: 'varchar', length: 120, default: '' })
  name: string;

  @ApiProperty() @Column({ type: 'varchar', length: 254, default: '' })
  email: string;

  @ApiProperty() @Column({ type: 'text', default: '' })
  message: string;

  @ApiProperty({ enum: FEEDBACK_STATUSES }) @Column({ type: 'varchar', length: 10, default: 'new' })
  status: FeedbackStatus;

  /** Last staff reply sent by e-mail. */
  @ApiProperty() @Column({ type: 'text', default: '' })
  reply: string;

  @ApiProperty({ nullable: true, type: Number }) @Column({ name: 'replied_at', type: 'bigint', nullable: true, transformer: asNumber })
  repliedAt: number | null;

  @ApiProperty() @Column({ name: 'replied_by', type: 'varchar', length: 120, default: '' })
  repliedBy: string;

  @Column({ name: 'ip_hash', type: 'varchar', length: 16, default: '' })
  ipHash: string;

  @ApiProperty() @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
