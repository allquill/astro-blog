const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export const fmtDateTime = (v: string | number | null | undefined) => (v ? dateTime.format(new Date(v)) : '—');
export const fmtDate = (v: string | number | null | undefined) => (v ? dateOnly.format(new Date(v)) : '—');

/** "5 min ago", "3 h ago", "2 d ago". */
export function ago(v: string | number | null | undefined) {
  if (!v) return '—';
  const s = (Date.now() - new Date(v).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86_400)} d ago`;
}

/** 1234 → "1,234". */
export const num = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toLocaleString());

/** "Hello Astro World" → "hello-astro-world". */
export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
