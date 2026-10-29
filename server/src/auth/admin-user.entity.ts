import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type AdminRole = 'admin' | 'staff';
export const ADMIN_ROLES: AdminRole[] = ['admin', 'staff'];

// bigint comes back as a string from Postgres; keep it a number (or null) in code.
const ms = { to: (v: number | null) => v, from: (v: string | number | null) => (v === null ? null : Number(v)) };

/**
 * A user of the admin app. Passwords are bcrypt hashes (like ef-backend). Roles:
 *   admin — everything, including managing users;  staff — subscribers, feedback and digests, but not users or settings.
 * An invited user has no password until they accept their invite link.
 */
@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 254, nullable: true, unique: true })
  email: string | null;

  @Column({ type: 'varchar', length: 10, default: 'admin' })
  role: AdminRole;

  @Column({ type: 'boolean', default: false })
  disabled: boolean;

  /** bcrypt hash; null until an invited user sets their password. */
  @Column({ name: 'password_hash', type: 'varchar', length: 100, nullable: true })
  passwordHash: string | null;

  /** Tokens issued before this moment are rejected, so a password change logs out other sessions. */
  @Column({ name: 'password_changed_at', type: 'bigint', transformer: ms })
  passwordChangedAt: number;

  /** SHA-256 of the one-time invite / reset token (the token itself is only ever in the e-mailed link). */
  @Column({ name: 'invite_token_hash', type: 'varchar', length: 64, nullable: true })
  inviteTokenHash: string | null;

  @Column({ name: 'invite_expires_at', type: 'bigint', nullable: true, transformer: ms })
  inviteExpiresAt: number | null;

  @Column({ name: 'last_login_at', type: 'bigint', nullable: true, transformer: ms })
  lastLoginAt: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
