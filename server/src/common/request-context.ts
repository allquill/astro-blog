import type { Request } from 'express';

/** Real client IP: the configured proxy header (nginx X-Real-IP / Cloudflare), else the socket. */
export function clientIp(req: Request, header: string) {
  const fromHeader = header ? req.headers[header.toLowerCase()] : undefined;
  const value = Array.isArray(fromHeader) ? fromHeader[0] : fromHeader;
  if (value) return value.split(',')[0]!.trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

/** Host the browser used, as forwarded by nginx or the Vite dev proxy. */
export const requestHost = (req: Request) =>
  (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? '';

/** True when a state-changing request comes from a page on this same site. */
export function isSameOrigin(req: Request) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host === requestHost(req);
  } catch {
    return false;
  }
}

/** Browser form posts (no JavaScript) are urlencoded; the site's fetch() posts JSON. */
export const isFormPost = (req: Request) =>
  (req.headers['content-type'] ?? '').includes('application/x-www-form-urlencoded');

/**
 * A plain browser form post (no JavaScript): the site's fetch() asks for JSON, a browser navigation
 * asks for text/html. Used to answer with a redirect instead of JSON.
 */
export const wantsHtml = (req: Request) => {
  const accept = req.headers.accept ?? '';
  return accept.includes('text/html') && !accept.includes('application/json');
};
