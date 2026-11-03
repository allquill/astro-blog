// Content import and export from the command line, against the configured database:
//
//   pnpm --dir server run content:import -- <file.zip | file.md | folder> [--overwrite] [--draft] [--dry-run]
//   pnpm --dir server run content:export -- <out.zip> [--published]
//   docker compose exec server node dist/cli/content.js import /data/backup.zip
//
// A folder is read as an export unpacked on disk, or as the old Keystatic website (website/, with
// src/content/, src/assets/ and public/), so moving existing content in is one command:
//   pnpm --dir server run content:import -- ../website
// Reads the same settings as the API (server/.env, then the environment).
import '../common/utc';
import 'reflect-metadata';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { THROTTLERS } from '../common/ip-throttler.guard';
import { AppConfigModule } from '../config/app-config.service';
import { validate } from '../config/env.validation';
import { ContentModule } from '../content/content.module';
import { IMPORT_LIMITS, TransferService, type ImportItem } from '../content/transfer/transfer.service';
import { DatabaseModule } from '../database/database.module';
import { SiteFeedModule } from '../feed/site-feed.service';
import { MailModule } from '../mail/mail.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', validate }),
    AppConfigModule,
    // The content module's controllers are registered here too (no HTTP server is started); their guards need it.
    ThrottlerModule.forRoot({ throttlers: Object.entries(THROTTLERS).map(([name, t]) => ({ name, ...t })) }),
    DatabaseModule, MailModule, SiteFeedModule, SettingsModule, ContentModule],
})
class ContentCliModule {}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.astro', 'cache']);

/** The files under a folder as archive paths. For a website checkout, only its content and images. */
function readFolder(root: string) {
  const files = new Map<string, Uint8Array>();
  const website = existsSync(join(root, 'src', 'content'));
  const roots = website ? ['src/content', 'src/assets', 'public/images'].map((p) => join(root, p)).filter(existsSync) : [root];
  let total = 0;
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
      const path = join(dir, name);
      const st = statSync(path);
      if (st.isDirectory()) walk(path);
      else if (st.isFile()) {
        total += st.size;
        if (files.size >= IMPORT_LIMITS.entries * 5 || total > IMPORT_LIMITS.unpackedBytes) throw new Error('The folder is too large to import in one go.');
        files.set(relative(root, path).split(sep).join('/'), new Uint8Array(readFileSync(path)));
      }
    }
  };
  for (const r of roots) walk(r);
  return files;
}

function print(items: ImportItem[], dryRun: boolean) {
  const width = Math.max(...items.map((i) => `${i.kind} ${i.slug}`.length), 10);
  for (const i of items) {
    console.log(`${i.action.padEnd(7)} ${`${i.kind} ${i.slug}`.padEnd(width)}  ${i.messages.join('; ')}`);
  }
  const count = (a: string) => items.filter((i) => i.action === a).length;
  console.log(`\n${dryRun ? 'Dry run: nothing was changed. ' : ''}${count('create')} to create, ${count('update')} to update, ${count('skip')} skipped, ${count('error')} with errors.`);
}

async function main() {
  // pnpm forwards a literal `--` separator; ignore it.
  const [command, target, ...rest] = process.argv.slice(2).filter((a) => a !== '--');
  const flags = new Set(rest);
  if (!command || !target || !['import', 'export'].includes(command)) {
    console.error('Usage:\n  content.js import <file.zip | file.md | folder> [--overwrite] [--draft] [--dry-run]\n  content.js export <out.zip> [--published]');
    process.exit(1);
  }
  const app = await NestFactory.createApplicationContext(ContentCliModule, { logger: ['error', 'warn'] });
  const transfer = app.get(TransferService);
  try {
    if (command === 'export') {
      const data = await transfer.exportAll({ include: ['topic', 'author', 'post', 'page', 'site', 'home'], status: flags.has('--published') ? 'published' : 'all' });
      writeFileSync(target, data);
      console.log(`Wrote ${target} (${Math.round(data.length / 1024)} KB)`);
      return;
    }
    const files = statSync(target).isDirectory() ? readFolder(target) : transfer.readUpload(readFileSync(target), target);
    const dryRun = flags.has('--dry-run');
    const items = await transfer.import(files, {
      dryRun,
      onConflict: flags.has('--overwrite') ? 'overwrite' : 'skip',
      asDraft: flags.has('--draft'),
      by: 'import:cli',
    });
    print(items, dryRun);
    if (items.some((i) => i.action === 'error')) process.exitCode = 2;
  } finally {
    await app.close();
  }
}

main().catch((e: Error) => {
  new Logger('content').error(e.message);
  process.exit(1);
});
