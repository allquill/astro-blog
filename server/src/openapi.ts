import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ADMIN_COOKIE } from './auth/jwt.strategy';

/** The OpenAPI document the admin SPA's client is generated from (admin/: pnpm run sdk). */
export function openApiDocument(app: INestApplication) {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Astro Blog API')
      .setDescription(
        'Public endpoints used by the website (likes, shares, subscribe, feedback) and the admin API ' +
          `used by the admin app (cookie ${ADMIN_COOKIE}, set by POST /api/auth/login).`,
      )
      .setVersion(process.env.npm_package_version ?? '0.1.0')
      .addCookieAuth(ADMIN_COOKIE)
      .build(),
  );
}
