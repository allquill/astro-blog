import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfig } from '../config/app-config.service';
import type { AdminRole } from './admin-user.entity';
import { AdminUsersService } from './admin-users.service';

export const ADMIN_COOKIE = 'sp_admin';
export const ADMIN_JWT_STRATEGY = 'admin-jwt';

export interface AdminJwtPayload {
  sub: number;
  username: string;
  /** The user's passwordChangedAt when the token was issued; any password change invalidates it. */
  pwc: number;
  iat: number;
  exp: number;
}

export interface AdminPrincipal {
  id: number;
  username: string;
  role: AdminRole;
}

/**
 * Admin access tokens: JWTs signed with JWT_SECRET_KEY (like ef-backend's AccessTokenStrategy).
 * The admin SPA never sees the token: it travels in an HttpOnly cookie (path /api); a Bearer header is
 * accepted too.
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, ADMIN_JWT_STRATEGY) {
  constructor(
    config: AppConfig,
    private readonly users: AdminUsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => (req?.cookies?.[ADMIN_COOKIE] as string | undefined) ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: config.get('JWT_SECRET_KEY'),
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }

  async validate(payload: AdminJwtPayload): Promise<AdminPrincipal> {
    // Loaded on every request, so disabling a user or changing their role takes effect immediately.
    const user = await this.users.findById(payload.sub);
    if (
      !user ||
      user.disabled ||
      !user.passwordHash ||
      payload.pwc !== user.passwordChangedAt // issued before the last password change
    ) {
      throw new UnauthorizedException();
    }
    return { id: user.id, username: user.username, role: user.role };
  }
}
