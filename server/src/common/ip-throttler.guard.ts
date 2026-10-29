import { applyDecorators, Injectable, UseGuards } from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { clientIp } from './request-context';
import { hashIp } from './security';

/** Every named limit in app.module.ts. A guarded route applies its own and skips the others. */
export const THROTTLERS = {
  engage: { ttl: 10 * 60 * 1000, limit: 120 }, // likes + share clicks per visitor
  subscribe: { ttl: 10 * 60 * 1000, limit: 6 }, // subscribe / preference changes per visitor
  feedback: { ttl: 10 * 60 * 1000, limit: 6 }, // feedback messages per visitor
  login: { ttl: 15 * 60 * 1000, limit: 10 }, // admin login / invite attempts per visitor
} as const;
export type ThrottlerName = keyof typeof THROTTLERS;

/** Rate-limits per real client IP (CLIENT_IP_HEADER set by nginx / Cloudflare), hashed. */
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const r = req as unknown as Request;
    return hashIp(clientIp(r, process.env.CLIENT_IP_HEADER ?? 'x-real-ip'), process.env.JWT_SECRET_KEY ?? '');
  }
}

/** Rate-limits a route by one named limit only. */
export const Limit = (name: ThrottlerName) =>
  applyDecorators(
    SkipThrottle(Object.fromEntries(Object.keys(THROTTLERS).filter((n) => n !== name).map((n) => [n, true]))),
    UseGuards(IpThrottlerGuard),
  );
