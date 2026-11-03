import type { ValueTransformer } from 'typeorm';

// Column helpers shared by the entities. Both SQLite and Postgres are supported, so column types are
// kept to what both drivers understand (see database/migrations for the matching table definitions).

/** bigint / int columns come back as strings from Postgres; keep them numbers (or null) in code. */
export const asNumber: ValueTransformer = {
  to: (v: number | null) => v,
  from: (v: string | number | null) => (v === null || v === undefined ? null : Number(v)),
};

/** A JSON value kept in a `text` column (both drivers; no jsonb), parsed on read. */
export function jsonText<T>(fallback: T): ValueTransformer {
  return {
    to: (v: T | null | undefined) => JSON.stringify(v ?? fallback),
    from: (v: string | null) => {
      if (!v) return fallback;
      try {
        return JSON.parse(v) as T;
      } catch {
        return fallback;
      }
    },
  };
}
