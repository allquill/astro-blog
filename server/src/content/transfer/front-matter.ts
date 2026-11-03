import { CORE_SCHEMA, dump, load } from 'js-yaml';

// Markdown files with YAML front matter, the import/export format of posts and pages:
//
//   ---
//   title: Hello
//   tags: [a, b]
//   ---
//   Body in Markdoc (Markdown plus the site's {% tags %}).
//
// YAML is read with the core schema: dates stay strings and nothing but plain data is constructed.

export type Data = Record<string, unknown>;

export function parseYaml(text: string, what: string): Data {
  let v: unknown;
  try {
    v = load(text, { schema: CORE_SCHEMA });
  } catch (e) {
    throw new Error(`${what}: invalid YAML (${(e as Error).message.split('\n')[0]})`);
  }
  if (v == null) return {};
  if (typeof v !== 'object' || Array.isArray(v)) throw new Error(`${what}: expected a YAML mapping`);
  return v as Data;
}

export function parseFrontMatter(text: string, what: string): { data: Data; body: string } {
  const src = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(src);
  if (!m) return { data: {}, body: src };
  return { data: parseYaml(m[1]!, what), body: src.slice(m[0].length).replace(/^\n/, '') };
}

export function toYaml(data: Data) {
  // Leave out empty optional values, as the old Keystatic files did.
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  return dump(clean, { schema: CORE_SCHEMA, lineWidth: 100, noRefs: true });
}

export function toFrontMatter(data: Data, body: string) {
  return `---\n${toYaml(data)}---\n${body.endsWith('\n') ? body : `${body}\n`}`;
}

// -------------------------------------------------------------------------- loose readers

export const str = (v: unknown, def = '') => (typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : def);
export const bool = (v: unknown, def = false) => (typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : def);
export const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : def);
export const strList = (v: unknown) => (Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : typeof v === 'string' && v ? [v] : []);

/** A YAML date ("2026-10-20" or a date-time) as an ISO string, or null. */
export function isoDate(v: unknown): string | null {
  const s = str(v).trim();
  if (!s) return null;
  const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00Z` : s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Epoch ms → "2026-10-20" (midnight UTC) or a full ISO date-time. */
export function yamlDate(ms: number | null): string | undefined {
  if (ms == null) return undefined;
  const iso = new Date(ms).toISOString();
  return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
}
