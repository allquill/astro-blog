import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, MinLength, validateSync,
} from 'class-validator';

// All configuration comes from the environment (server/.env in development, the compose env_file in
// production). It is validated at start-up so a misconfigured deployment fails loudly with a list of
// what to fix, not on the first subscription.

const toBool = (def: boolean) => ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? def : ['true', '1', 'yes'].includes(String(value).toLowerCase());

export class EnvironmentVariables {
  @IsOptional() @IsIn(['development', 'production', 'test'])
  NODE_ENV: string = 'development';

  @Transform(({ value }) => (value === undefined || value === '' ? 3002 : Number(value)))
  @IsInt() @Min(1) @Max(65535)
  PORT: number = 3002;

  @IsString()
  HOST: string = '0.0.0.0';

  // ------------------------------------------------------------------------- database
  @IsIn(['sqlite', 'postgres'], { message: 'DATABASE_TYPE must be sqlite or postgres' })
  DATABASE_TYPE: 'sqlite' | 'postgres' = 'sqlite';

  /** SQLite file (DATABASE_TYPE=sqlite). */
  @IsString()
  DATABASE_PATH: string = './data/astro-blog.db';

  /** Postgres connection (DATABASE_TYPE=postgres). */
  @IsOptional() @IsString() DATABASE_HOST?: string;
  @IsOptional() @Transform(({ value }) => (value ? Number(value) : 5432)) @IsInt() DATABASE_PORT: number = 5432;
  @IsOptional() @IsString() DATABASE_USER?: string;
  @IsOptional() @IsString() DATABASE_PASSWORD?: string;
  @IsOptional() @IsString() DATABASE_NAME?: string;

  // ----------------------------------------------------------------------------- SMTP
  @IsNotEmpty({ message: 'SMTP_HOST is required' })
  SMTP_HOST: string;

  @Transform(({ value }) => (value === undefined || value === '' ? 587 : Number(value)))
  @IsInt()
  SMTP_PORT: number = 587;

  /** true = implicit TLS (usually port 465); false = STARTTLS upgrade when offered (587/25). */
  @Transform(toBool(false))
  SMTP_SECURE: boolean = false;

  @IsOptional() @IsString() SMTP_USER: string = '';
  @IsOptional() @IsString() SMTP_PASSWORD: string = '';

  @MinLength(3, { message: 'MAIL_FROM is required, e.g. "Acme Dev Blog <no-reply@example.com>"' })
  MAIL_FROM: string;

  /**
   * Comma-separated list of addresses that receive new-feedback notifications. The admin can override
   * it at runtime (Settings → Notification e-mails).
   */
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((x) => x.trim()).filter(Boolean) : value,
  )
  @IsEmail({}, { each: true, message: 'NOTIFY_TO must be one or more comma-separated e-mail addresses' })
  @IsNotEmpty({ message: 'NOTIFY_TO is required' })
  NOTIFY_TO: string[];

  /** Address readers' e-mail replies go to (Reply-To on every e-mail to a reader). Empty = first NOTIFY_TO. */
  @IsOptional() @IsString()
  MAIL_REPLY_TO: string = '';

  // ----------------------------------------------------------------------------- blog
  /** Shown in e-mails ("— The Acme Dev Blog team") until Settings → Blog name is saved. */
  @IsNotEmpty() @MaxLength(120)
  BLOG_NAME: string = 'Acme Dev Blog';

  /**
   * The site's JSON feed (posts and topics), built by the website. The API checks like/share/feedback
   * slugs against it and builds digests from it. Empty = <PUBLIC_SITE_URL>/feed.json.
   */
  @IsOptional() @IsString()
  SITE_FEED_URL: string = '';

  /** How many digest e-mails are sent per batch, and the pause between batches (ms). */
  @Transform(({ value }) => (value === undefined || value === '' ? 20 : Number(value)))
  @IsInt() @Min(1) @Max(500)
  DIGEST_BATCH_SIZE: number = 20;

  @Transform(({ value }) => (value === undefined || value === '' ? 1000 : Number(value)))
  @IsInt() @Min(0) @Max(60_000)
  DIGEST_BATCH_PAUSE_MS: number = 1000;

  // ---------------------------------------------------------------------------- admin
  /**
   * Signs admin login tokens (JWT, like ef-backend) and salts stored IP hashes. Any random string of
   * 32+ characters, e.g. `openssl rand -hex 32`. Changing it logs every admin out.
   */
  @MinLength(32, { message: 'JWT_SECRET_KEY must be at least 32 characters (e.g. `openssl rand -hex 32`)' })
  JWT_SECRET_KEY: string;

  /** How long an admin login lasts, e.g. 8h, 1d (same format as ef-backend). */
  @Matches(/^\d+\s*(ms|s|m|h|d|w|y)?$/, { message: 'JWT_TOKEN_EXPIRE_TIME must look like 8h, 30m or 1d' })
  JWT_TOKEN_EXPIRE_TIME: string = '8h';

  /** Username of the first admin, created on start-up when there is none yet. */
  @IsNotEmpty() @MaxLength(120)
  ADMIN_USERNAME: string = 'admin';

  /**
   * Plain-text password for that first admin. Used only when no admin exists yet (it is stored
   * bcrypt-hashed in the database); remove it from the file afterwards.
   */
  @IsOptional() @MinLength(12, { message: 'ADMIN_PASSWORD must be at least 12 characters' })
  ADMIN_PASSWORD?: string;

  /** Set to false only for plain-http local testing on a non-localhost host. */
  @Transform(toBool(true))
  COOKIE_SECURE: boolean = true;

  // ---------------------------------------------------------------------------- other
  /** Public site URL, used for post, confirm and unsubscribe links in e-mails. */
  @IsUrl({ require_tld: false, require_protocol: true }, { message: 'PUBLIC_SITE_URL must be a URL like https://www.example.com' })
  PUBLIC_SITE_URL: string = 'http://localhost:4322';

  /** Admin app URL, used for "Open in admin" and invite links in staff e-mails. */
  @IsUrl({ require_tld: false, require_protocol: true }, { message: 'ADMIN_URL must be a URL like https://admin.example.com' })
  ADMIN_URL: string = 'http://localhost:5175';

  /**
   * Request header holding the real client IP when behind a proxy. nginx in this project sets
   * `X-Real-IP`; behind Cloudflare use `cf-connecting-ip`. Empty = use the socket address.
   */
  @IsOptional() @IsString()
  CLIENT_IP_HEADER: string = 'x-real-ip';

  /**
   * Folder of the project guides (Markdown) served to staff with docsify at /api/admin/docs/.
   * Relative to the server's working directory; the Docker image sets /app/docs.
   */
  @IsNotEmpty() @IsString()
  DOCS_DIR: string = '../docs';

  /** Swagger UI at /api/docs. Defaults to on except when NODE_ENV=production. */
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : ['true', '1', 'yes'].includes(String(value).toLowerCase())))
  SWAGGER_ENABLED?: boolean;
}

export function validate(config: Record<string, unknown>) {
  const env = plainToInstance(EnvironmentVariables, config, { exposeDefaultValues: true });
  if (env.ADMIN_PASSWORD === '') env.ADMIN_PASSWORD = undefined;
  // Defaults that depend on other settings (@Transform doesn't run for keys that aren't set).
  env.SWAGGER_ENABLED ??= env.NODE_ENV !== 'production';
  env.SITE_FEED_URL ||= new URL('/feed.json', env.PUBLIC_SITE_URL).toString();
  const errors = validateSync(env, { skipMissingProperties: false, whitelist: false });
  const problems = errors.flatMap((e) => Object.values(e.constraints ?? {}).map((m) => `  - ${e.property}: ${m}`));
  if (env.DATABASE_TYPE === 'postgres') {
    for (const key of ['DATABASE_HOST', 'DATABASE_USER', 'DATABASE_NAME'] as const) {
      if (!env[key]) problems.push(`  - ${key}: required when DATABASE_TYPE=postgres`);
    }
  }
  if (problems.length) {
    throw new Error(`Invalid API configuration (see server/env.example):\n${problems.join('\n')}`);
  }
  return env;
}
