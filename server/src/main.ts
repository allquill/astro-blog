import './common/utc';
import 'reflect-metadata';
import { BadRequestException, Logger, ValidationPipe, type ValidationError } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost, NestFactory } from '@nestjs/core';
import type { ArgumentsHost } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './config/app-config.service';
import { PublicExceptionFilter } from './common/public-exception.filter';
import { MailService } from './mail/mail.service';
import { openApiDocument } from './openapi';

// Order in which a field's validation messages are preferred (first failing wins).
const PRIORITY = ['isNotEmpty', 'isEmail', 'matches', 'isIn', 'maxLength', 'isString'];
const firstMessage = (e: ValidationError): string => {
  if (!e.constraints && e.children?.length) return firstMessage(e.children[0]!);
  const c = e.constraints ?? {};
  const key = PRIORITY.find((k) => c[k]) ?? Object.keys(c)[0];
  return key ? c[key]! : 'Invalid value';
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  const config = app.get(AppConfig);

  // 3 MB: room for a subscriber CSV import from the admin; the public forms are a few hundred bytes.
  app.useBodyParser('json', { limit: '3mb' });
  app.useBodyParser('urlencoded', { limit: '256kb', extended: false });
  app.use(cookieParser());
  app.disable('x-powered-by');
  app.enableShutdownHooks();

  // Validation errors everywhere have one shape: { errors: { field: message } } (the site and the admin rely on it).
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) =>
        new BadRequestException({ message: 'Please check the highlighted fields.', errors: Object.fromEntries(errors.map((e) => [e.property, firstMessage(e)])) }),
    }),
  );

  // Errors raised before routing (e.g. malformed JSON from the body parser) skip controller filters;
  // keep the public API's { ok: false, … } contract for those too.
  const publicFilter = new PublicExceptionFilter();
  class GlobalFilter extends BaseExceptionFilter {
    override catch(exception: unknown, host: ArgumentsHost) {
      const req = host.switchToHttp().getRequest<{ path?: string }>();
      if (req.path?.startsWith('/api/public')) return publicFilter.catch(exception, host);
      return super.catch(exception, host);
    }
  }
  app.useGlobalFilters(new GlobalFilter(app.get(HttpAdapterHost).httpAdapter));

  if (config.get('SWAGGER_ENABLED')) {
    SwaggerModule.setup('api/docs', app, openApiDocument(app), { jsonDocumentUrl: 'api/docs-json' });
  }

  const port = config.get('PORT');
  await app.listen(port, config.get('HOST'));
  const db = config.get('DATABASE_TYPE') === 'postgres' ? `postgres ${config.get('DATABASE_HOST')}/${config.get('DATABASE_NAME')}` : config.get('DATABASE_PATH');
  Logger.log(`astro-blog-api listening on http://${config.get('HOST')}:${port} (db: ${db})${config.get('SWAGGER_ENABLED') ? ' · docs at /api/docs' : ''}`, 'Bootstrap');
  void app.get(MailService).verify();
}

bootstrap().catch((e: Error) => {
  // Configuration problems carry a readable list; print it without a stack trace.
  console.error(e.message.startsWith('Invalid API configuration') ? e.message : e);
  process.exit(1);
});
