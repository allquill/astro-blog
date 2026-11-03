import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { FetchedCodeDto } from './content.dto';

const MAX_BYTES = 256 * 1024;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

// Addresses a fetch may never reach (server-side request forgery): loopback, private, link-local
// (cloud metadata), carrier-grade NAT, multicast, reserved, and their IPv6 equivalents.
const blocked = new BlockList();
for (const [net, bits] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(net, bits, 'ipv4');
for (const [net, bits] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['64:ff9b::', 96], ['2001:db8::', 32]] as const) {
  blocked.addSubnet(net, bits, 'ipv6');
}

export function isBlockedAddress(address: string) {
  const v = isIP(address);
  if (v === 4) return blocked.check(address, 'ipv4');
  if (v === 6) {
    // IPv4-mapped (::ffff:10.0.0.1) is checked as the IPv4 address it carries.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    return mapped ? blocked.check(mapped[1]!, 'ipv4') : blocked.check(address, 'ipv6');
  }
  return true;
}

const LANGUAGES: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', mts: 'typescript', cts: 'typescript', js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'jsx',
  json: 'json', jsonc: 'jsonc', md: 'markdown', mdx: 'mdx', mdoc: 'markdown', astro: 'astro', vue: 'vue', svelte: 'svelte',
  html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'sass', less: 'less', xml: 'xml', svg: 'xml',
  yml: 'yaml', yaml: 'yaml', toml: 'toml', ini: 'ini', env: 'dotenv', sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'fish', ps1: 'powershell',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin', kts: 'kotlin', scala: 'scala', swift: 'swift',
  c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp', cs: 'csharp', php: 'php', sql: 'sql', graphql: 'graphql', gql: 'graphql',
  dart: 'dart', lua: 'lua', r: 'r', ex: 'elixir', exs: 'elixir', erl: 'erlang', hs: 'haskell', clj: 'clojure', tf: 'hcl', hcl: 'hcl',
  proto: 'proto', prisma: 'prisma', diff: 'diff', patch: 'diff', txt: 'plaintext',
};
const FILE_LANGUAGES: Record<string, string> = { dockerfile: 'docker', makefile: 'makefile', '.gitignore': 'plaintext', caddyfile: 'plaintext' };

/** Turns a code host's file page into its raw-file URL and reads the line range from the link. */
export function resolveSource(link: string) {
  const u = new URL(link);
  if (u.protocol !== 'https:') throw new BadRequestException({ message: 'Use an https:// link.', errors: { url: 'Use an https:// link' } });
  let raw = new URL(u.toString());
  raw.hash = '';
  let from: number | null = null;
  let to: number | null = null;
  const hash = u.hash;

  const gh = /^\/([^/]+)\/([^/]+)\/blob\/(.+)$/.exec(u.pathname);
  const gl = /^\/(.+?)\/-\/blob\/(.+)$/.exec(u.pathname);
  const bb = /^\/([^/]+)\/([^/]+)\/src\/(.+)$/.exec(u.pathname);
  if (u.hostname === 'github.com' && gh) {
    raw = new URL(`https://raw.githubusercontent.com/${gh[1]}/${gh[2]}/${gh[3]}`);
  } else if (u.hostname === 'gitlab.com' && gl) {
    raw = new URL(`https://gitlab.com/${gl[1]}/-/raw/${gl[2]}`);
  } else if (u.hostname === 'bitbucket.org' && bb) {
    raw = new URL(`https://bitbucket.org/${bb[1]}/${bb[2]}/raw/${bb[3]}`);
  } else if (u.hostname === 'gist.github.com' && /^\/[^/]+\/[0-9a-f]+\/?$/.test(u.pathname)) {
    raw = new URL(`https://gist.githubusercontent.com${u.pathname.replace(/\/$/, '')}/raw`);
  }
  // #L10-L20 (GitHub), #L10-20 (GitLab), #lines-10:20 (Bitbucket), #L10 (one line).
  const range = /^#L(\d+)(?:-L?(\d+))?$/.exec(hash) ?? /^#lines-(\d+)(?::(\d+))?$/.exec(hash);
  if (range) {
    from = Number(range[1]);
    to = Number(range[2] ?? range[1]);
    if (to < from) [from, to] = [to, from];
  }
  const fileName = decodeURIComponent(raw.pathname.split('/').filter(Boolean).pop() ?? '');
  return { raw, from, to, fileName };
}

export function languageOf(fileName: string) {
  const lower = fileName.toLowerCase();
  if (FILE_LANGUAGES[lower]) return FILE_LANGUAGES[lower]!;
  if (lower.startsWith('dockerfile')) return 'docker';
  const ext = lower.includes('.') ? lower.split('.').pop()! : '';
  return LANGUAGES[ext] ?? '';
}

const TEXT_TYPES = /^(text\/|application\/(json|xml|javascript|ecmascript|x-sh|x-yaml|yaml|toml|x-httpd-php|sql|graphql|x-typescript|typescript))/;

/**
 * Fetches a public code file for the editor's "Insert code → Fetch from URL". Guarded against SSRF:
 * https only, every hop's address is resolved and checked (and the connection pinned to it, so DNS
 * can't change between check and connect), at most 3 redirects, 5 s, 256 KB, text only.
 */
@Injectable()
export class CodeFetchService {
  async fetch(link: string): Promise<FetchedCodeDto> {
    const { raw, from, to, fileName } = resolveSource(link);
    const text = await this.get(raw, 0);
    if (text.includes('\u0000')) throw new BadRequestException('That file looks binary, not code.');
    let content = text.replace(/\r\n?/g, '\n');
    if (from) {
      const lines = content.split('\n');
      if (from > lines.length) throw new BadRequestException(`The file has only ${lines.length} lines.`);
      content = lines.slice(from - 1, to ?? from).join('\n');
    }
    return { content: content.replace(/\n+$/, ''), language: languageOf(fileName), title: fileName, source: link, fromLine: from, toLine: to };
  }

  private async get(url: URL, hop: number): Promise<string> {
    if (url.protocol !== 'https:') throw new BadRequestException('Only https:// links can be fetched.');
    if (url.username || url.password) throw new BadRequestException('Links with credentials are not allowed.');
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true }).catch(() => []);
    if (!addresses.length) throw new BadRequestException(`Could not find ${host}.`);
    if (addresses.some((a) => isBlockedAddress(a.address))) throw new BadRequestException('That address is not reachable from here.');
    const pinned = addresses[0]!;
    const pin: LookupFunction = (_h, opts, cb) => {
      if (opts && (opts as { all?: boolean }).all) (cb as unknown as (e: null, a: { address: string; family: number }[]) => void)(null, [pinned]);
      else cb(null, pinned.address, pinned.family);
    };

    return new Promise<string>((resolvePromise, reject) => {
      const req = request(
        url,
        { method: 'GET', lookup: pin, timeout: TIMEOUT_MS, headers: { 'user-agent': 'astro-blog-code-fetch', accept: 'text/plain, */*;q=0.5' } },
        (res) => {
          const status = res.statusCode ?? 0;
          if (status >= 300 && status < 400 && res.headers.location) {
            res.resume();
            if (hop >= MAX_REDIRECTS) return reject(new BadRequestException('Too many redirects.'));
            let next: URL;
            try {
              next = new URL(res.headers.location, url);
            } catch {
              return reject(new BadRequestException('The link redirects somewhere invalid.'));
            }
            return this.get(next, hop + 1).then(resolvePromise, reject);
          }
          if (status !== 200) {
            res.resume();
            return reject(new BadRequestException(status === 404 ? 'File not found (is the repository public?).' : `The server answered ${status}.`));
          }
          const type = String(res.headers['content-type'] ?? '').toLowerCase();
          if (type && !TEXT_TYPES.test(type)) {
            res.resume();
            return reject(new BadRequestException(`That link is not a text file (${type.split(';')[0]}).`));
          }
          const chunks: Buffer[] = [];
          let size = 0;
          res.on('data', (c: Buffer) => {
            size += c.length;
            if (size > MAX_BYTES) {
              req.destroy();
              reject(new BadRequestException('The file is larger than 256 KB; link to a line range instead.'));
            } else chunks.push(c);
          });
          res.on('end', () => resolvePromise(Buffer.concat(chunks).toString('utf8')));
          res.on('error', () => reject(new BadRequestException('The download failed.')));
        },
      );
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', (e) => reject(e instanceof BadRequestException ? e : new BadRequestException(e.message === 'timeout' ? 'The server took too long to answer.' : 'Could not download that file.')));
      req.end();
    });
  }
}
