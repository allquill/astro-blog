import type { ValueTransformer } from 'typeorm';

// Column helpers shared by the entities. Both SQLite and Postgres are supported, so column types are
// kept to what both drivers understand (see database/migrations for the matching table definitions).

/** bigint / int columns come back as strings from Postgres; keep them numbers (or null) in code. */
export const asNumber: ValueTransformer = {
  to: (v: number | null) => v,
  from: (v: string | number | null) => (v === null || v === undefined ? null : Number(v)),
};
