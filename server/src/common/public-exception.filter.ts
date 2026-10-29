import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { wantsHtml } from './request-context';

/** Where a no-JavaScript form post goes back to when it fails, by route. */
function formPage(path: string) {
  if (path.includes('/subscribe/manage')) return '/subscribe/manage/';
  if (path.includes('/subscribe/confirm')) return '/subscribe/confirm/';
  if (path.includes('/subscribe')) return '/subscribe/';
  if (path.includes('/feedback')) return '/feedback/';
  return '/';
}

/**
 * The public API's error contract: JSON `{ ok: false, errors: { field: message } | error }` for the
 * site's fetch(), or — for a no-JavaScript form post — a 303 back to the form with ?error=1.
 */
@Catch()
export class PublicExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Public');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    if (req.method === 'POST' && wantsHtml(req)) return res.redirect(303, `${formPage(req.path)}?error=1`);

    if (exception instanceof ThrottlerException) {
      return res.status(429).json({ ok: false, error: 'Too many requests. Please try again in a few minutes.' });
    }
    if (exception instanceof BadRequestException) {
      const body = exception.getResponse() as { errors?: Record<string, string>; message?: string | string[] };
      if (body.errors) return res.status(400).json({ ok: false, errors: body.errors });
      return res.status(400).json({ ok: false, error: String(body.message ?? '') || 'Invalid request.' });
    }
    if (exception instanceof HttpException) {
      return res.status(exception.getStatus()).json({ ok: false, error: exception.message });
    }
    this.logger.error(exception);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
}
