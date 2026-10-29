import { createHash } from 'node:crypto';

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Salted, truncated hash so we can rate-limit and spot abuse without storing raw IPs. */
export const hashIp = (ip: string, secret: string) => sha256(`${secret}:${ip}`).slice(0, 16);

/** Keep header values single-line (defence in depth; nodemailer also encodes them). */
export const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();
