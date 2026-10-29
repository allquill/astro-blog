// Imported first by every entry point (main.ts, cli/*). Postgres `timestamp` columns (Create/UpdateDateColumn)
// carry no time zone, and node-postgres reads them in the process's local zone, while the database fills
// them in UTC (now()). Pinning the process to UTC keeps both drivers consistent on a developer laptop;
// in Docker the zone is UTC anyway.
process.env.TZ = 'UTC';
