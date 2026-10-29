import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException, applyDecorators, UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { isSameOrigin } from '../common/request-context';
import type { AdminRole } from './admin-user.entity';
import { ADMIN_COOKIE, ADMIN_JWT_STRATEGY, type AdminPrincipal } from './jwt.strategy';

export type AdminRequest = Request & { user?: AdminPrincipal };

/** Requires a valid admin JWT (HttpOnly cookie, or a Bearer header for scripts). */
@Injectable()
export class AdminAuthGuard extends AuthGuard(ADMIN_JWT_STRATEGY) {
  override handleRequest<T>(err: unknown, user: T): T {
    if (err || !user) throw new UnauthorizedException();
    return user;
  }
}

/** Restricts a controller or route to the given roles (used after AdminAuthGuard). */
export const Roles = (...roles: AdminRole[]) => SetMetadata('adminRoles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<AdminRole[] | undefined>('adminRoles', [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const role = ctx.switchToHttp().getRequest<AdminRequest>().user?.role;
    if (!role || !roles.includes(role)) throw new ForbiddenException('Only admins can do this.');
    return true;
  }
}

/**
 * CSRF defence for cookie-authenticated calls: every state-changing request must come from a page on
 * this same host (the admin SPA is served next to /api by nginx, or by the Vite dev proxy). Requests
 * with a Bearer header carry no ambient credentials, so they are exempt.
 */
@Injectable()
export class SameOriginGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    if (req.headers.authorization?.startsWith('Bearer ') && !(req.cookies as Record<string, string> | undefined)?.[ADMIN_COOKIE]) return true;
    if (!isSameOrigin(req)) throw new ForbiddenException('Cross-origin request refused');
    return true;
  }
}

/** Signed-in staff (any role), or only the given roles. Adds the matching Swagger annotations. */
export function Staff(...roles: AdminRole[]) {
  return applyDecorators(
    UseGuards(SameOriginGuard, AdminAuthGuard, RolesGuard),
    Roles(...roles),
    ApiCookieAuth(ADMIN_COOKIE),
    ApiUnauthorizedResponse({ description: 'Not signed in' }),
    ApiForbiddenResponse({ description: 'Signed in, but the role may not do this' }),
  );
}
