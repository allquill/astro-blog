import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { sha256 } from '../common/security';
import { type AdminRole, AdminUser } from './admin-user.entity';

export const BCRYPT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 12;
export const INVITE_TTL_MS = 48 * 60 * 60 * 1000;
export const USERNAME_RE = /^[A-Za-z0-9._-]{3,60}$/;

// Compared against when the user can't log in (unknown, disabled, not yet accepted), so every failed
// login takes as long as a real password check — no account enumeration by timing.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

/** A rule broken by a user-management action; the message is shown to the admin. */
export class UserRuleError extends Error {}

export type UserStatus = 'active' | 'invited' | 'invite expired' | 'disabled';

export function userStatus(u: AdminUser, now = Date.now()): UserStatus {
  if (u.disabled) return 'disabled';
  if (!u.passwordHash) return u.inviteExpiresAt && u.inviteExpiresAt > now ? 'invited' : 'invite expired';
  return 'active';
}

@Injectable()
export class AdminUsersService {
  constructor(@InjectRepository(AdminUser) private readonly users: Repository<AdminUser>) {}

  count() {
    return this.users.count();
  }

  findById(id: number) {
    return this.users.findOneBy({ id });
  }

  list() {
    return this.users.find({ order: { username: 'ASC' } });
  }

  private findByUsername(username: string) {
    return this.users
      .createQueryBuilder('u')
      .where('LOWER(u.username) = LOWER(:username)', { username: username.trim() })
      .getOne();
  }

  /** The user if the credentials match and the account can log in, else null. Records last login. */
  async verify(username: string, password: string) {
    const user = await this.findByUsername(username);
    const usable = user && !user.disabled && user.passwordHash;
    const ok = await bcrypt.compare(password, usable ? user.passwordHash! : DUMMY_HASH);
    if (!usable || !ok) return null;
    await this.users.update({ id: user.id }, { lastLoginAt: Date.now() });
    return user;
  }

  async checkPassword(user: AdminUser, password: string) {
    return Boolean(user.passwordHash) && bcrypt.compare(password, user.passwordHash!);
  }

  /** Sets a new password; clears any pending invite and logs out the user's other sessions. */
  async setPassword(user: AdminUser, password: string) {
    const changes = {
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      passwordChangedAt: Date.now(),
      inviteTokenHash: null,
      inviteExpiresAt: null,
    };
    await this.users.update({ id: user.id }, changes);
    return { ...user, ...changes };
  }

  /**
   * Seed / CLI: create an admin with this password, or reset an existing user's password and
   * re-enable it (lock-out recovery). Returns whether the user was created.
   */
  async ensureAdmin(username: string, password: string) {
    const existing = await this.findByUsername(username);
    if (existing) {
      await this.setPassword(existing, password);
      if (existing.disabled) await this.users.update({ id: existing.id }, { disabled: false });
      return { created: false };
    }
    await this.users.save(
      this.users.create({
        username,
        role: 'admin',
        passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        passwordChangedAt: Date.now(),
      }),
    );
    return { created: true };
  }

  // ------------------------------------------------------------------------------ invitations

  private newToken() {
    const token = randomBytes(32).toString('base64url');
    return { token, inviteTokenHash: sha256(token), inviteExpiresAt: Date.now() + INVITE_TTL_MS };
  }

  /** Creates a user without a password and returns the one-time invite token for their link. */
  async invite(input: { username: string; email: string; role: AdminRole }) {
    const username = input.username.trim();
    const email = input.email.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) throw new UserRuleError('Username: 3–60 letters, digits, dots, dashes or underscores.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new UserRuleError('Enter a valid e-mail address.');
    if (await this.findByUsername(username)) throw new UserRuleError(`The username "${username}" is already taken.`);
    if (await this.users.findOneBy({ email })) throw new UserRuleError(`${email} already belongs to another user.`);
    const { token, inviteTokenHash, inviteExpiresAt } = this.newToken();
    const user = await this.users.save(
      this.users.create({ username, email, role: input.role, passwordHash: null, passwordChangedAt: Date.now(), inviteTokenHash, inviteExpiresAt }),
    );
    return { user, token };
  }

  /** New invite / password-reset link for an existing user (replaces any previous link). */
  async reissueInvite(user: AdminUser) {
    if (!user.email) throw new UserRuleError('This user has no e-mail address, so a link cannot be sent.');
    const { token, inviteTokenHash, inviteExpiresAt } = this.newToken();
    await this.users.update({ id: user.id }, { inviteTokenHash, inviteExpiresAt });
    return token;
  }

  /** The user a still-valid invite / reset token belongs to, else null. */
  async findByInviteToken(token: string | undefined) {
    if (!token || token.length > 200) return null;
    const user = await this.users.findOneBy({ inviteTokenHash: sha256(token) });
    if (!user || user.disabled || !user.inviteExpiresAt || user.inviteExpiresAt < Date.now()) return null;
    return user;
  }

  // ---------------------------------------------------------------------- admin-only changes

  private async activeAdminCount() {
    return this.users
      .createQueryBuilder('u')
      .where("u.role = 'admin'")
      .andWhere('u.disabled = :off', { off: false })
      .andWhere('u.passwordHash IS NOT NULL')
      .getCount();
  }

  private async assertNotLastAdmin(target: AdminUser, action: string) {
    const isActiveAdmin = target.role === 'admin' && !target.disabled && target.passwordHash;
    if (isActiveAdmin && (await this.activeAdminCount()) <= 1) {
      throw new UserRuleError(`You can't ${action} the last active admin. Make another user an admin first.`);
    }
  }

  async setRole(actorId: number, target: AdminUser, role: AdminRole) {
    if (target.id === actorId) throw new UserRuleError("You can't change your own role.");
    if (target.role === role) return;
    if (role !== 'admin') await this.assertNotLastAdmin(target, 'demote');
    await this.users.update({ id: target.id }, { role });
  }

  async setDisabled(actorId: number, target: AdminUser, disabled: boolean) {
    if (target.id === actorId) throw new UserRuleError("You can't disable your own account.");
    if (disabled) await this.assertNotLastAdmin(target, 'disable');
    await this.users.update({ id: target.id }, { disabled });
  }

  async remove(actorId: number, target: AdminUser) {
    if (target.id === actorId) throw new UserRuleError("You can't delete your own account.");
    await this.assertNotLastAdmin(target, 'delete');
    await this.users.delete({ id: target.id });
  }
}
