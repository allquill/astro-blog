// Writes the OpenAPI document to a file without starting the HTTP server, for generating the admin
// SPA's client offline:   pnpm --dir server run build && pnpm --dir server run openapi ../admin/openapi.json
// It still boots the application context (and so connects to the configured database).
import '../common/utc';
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { openApiDocument } from '../openapi';

async function main() {
  const out = process.argv[2] ?? 'openapi.json';
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  writeFileSync(out, JSON.stringify(openApiDocument(app), null, 2) + '\n');
  await app.close();
  console.log(`Wrote ${out}`);
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
