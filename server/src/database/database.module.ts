import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Module } from '@nestjs/common';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { EnvironmentVariables } from '../config/env.validation';
import { AppConfig } from '../config/app-config.service';
import { AdminUser } from '../auth/admin-user.entity';
import { Digest, DigestDelivery } from '../digests/digest.entities';
import { PostLike, PostStat } from '../engagement/engagement.entities';
import { Feedback } from '../feedback/feedback.entity';
import { BlogSetting } from '../settings/blog-setting.entity';
import { Subscriber } from '../subscribers/subscriber.entity';
import { Init1800000000000 } from './migrations/1800000000000-Init';

/**
 * Every entity, for both drivers. One list (unlike ef-backend's postgres-only array) so an entity can
 * never work on SQLite and fail on Postgres. The TypeORM CLI (data-source.ts) needs it too.
 */
export const ENTITIES = [AdminUser, BlogSetting, PostStat, PostLike, Subscriber, Feedback, Digest, DigestDelivery];
export const MIGRATIONS = [Init1800000000000];

/** SQLite by default; set DATABASE_TYPE=postgres (+ DATABASE_*) to use Postgres. Schema changes are migrations. */
type DbEnv = Pick<
  EnvironmentVariables,
  'DATABASE_TYPE' | 'DATABASE_PATH' | 'DATABASE_HOST' | 'DATABASE_PORT' | 'DATABASE_USER' | 'DATABASE_PASSWORD' | 'DATABASE_NAME'
>;

export function typeOrmOptions(env: DbEnv): TypeOrmModuleOptions {
  const common = { entities: ENTITIES, migrations: MIGRATIONS, migrationsRun: true, synchronize: false, logging: ['error' as const] };
  if (env.DATABASE_TYPE === 'postgres') {
    return {
      ...common,
      type: 'postgres',
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      username: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
    };
  }
  if (env.DATABASE_PATH !== ':memory:') mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });
  return { ...common, type: 'sqlite', database: env.DATABASE_PATH, busyTimeout: 5000 };
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (c: AppConfig) =>
        typeOrmOptions({
          DATABASE_TYPE: c.get('DATABASE_TYPE'),
          DATABASE_PATH: c.get('DATABASE_PATH'),
          DATABASE_HOST: c.get('DATABASE_HOST'),
          DATABASE_PORT: c.get('DATABASE_PORT'),
          DATABASE_USER: c.get('DATABASE_USER'),
          DATABASE_PASSWORD: c.get('DATABASE_PASSWORD'),
          DATABASE_NAME: c.get('DATABASE_NAME'),
        }),
    }),
  ],
})
export class DatabaseModule {}
