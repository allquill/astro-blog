import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Reader links in e-mails: `<id>.<HMAC-SHA256(JWT_SECRET_KEY, "<purpose>:<id>:<access key>")>`.
// Nothing link-shaped is stored; a new access key on the row revokes every earlier link.

export type LinkPurpose = 'confirm' | 'manage';

export const newAccessKey = () => randomBytes(32).toString('hex');

const sign = (purpose: LinkPurpose, id: number, key: string, secret: string) =>
  createHmac('sha256', secret).update(`${purpose}:${id}:${key}`).digest('base64url');

export const linkToken = (purpose: LinkPurpose, id: number, key: string, secret: string) => `${id}.${sign(purpose, id, key, secret)}`;

/** The id a token claims, or null when it is malformed (the signature is checked by verifyToken). */
export function tokenId(token: string | undefined): number | null {
  const m = /^(\d{1,10})\.([A-Za-z0-9_-]{43})$/.exec(token ?? '');
  return m ? Number(m[1]) : null;
}

export function verifyToken(token: string, purpose: LinkPurpose, id: number, key: string, secret: string) {
  const expected = Buffer.from(linkToken(purpose, id, key, secret));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
