import {
  Body, Controller, Delete, Get, Header, HttpCode, Module, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UseFilters,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiConsumes, ApiOkResponse, ApiOperation, ApiProduces, ApiQuery, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Request, Response } from 'express';
import { Staff } from '../auth/guards';
import { AppConfig } from '../config/app-config.service';
import { OkDto } from '../common/dto';
import { Limit } from '../common/ip-throttler.guard';
import { PublicExceptionFilter } from '../common/public-exception.filter';
import { clientIp, wantsHtml } from '../common/request-context';
import { hashIp } from '../common/security';
import {
  ConfirmResultDto, ImportResultDto, ImportSubscribersDto, ManageSubscriptionDto, SubscribeDto, SubscribeResultDto, SubscriberCountsDto,
  SubscriberDto, SubscriberFilterDto, SubscriberPageDto, SubscriberQueryDto, SubscriptionDto, TokenDto, UpdateSubscriberDto,
} from './subscriber.dto';
import { Subscriber } from './subscriber.entity';
import { SUBSCRIBE_MESSAGE, SubscribersService } from './subscribers.service';

const manageUrl = (token: string, extra = '') => `/subscribe/manage/?token=${encodeURIComponent(token)}${extra}`;

/**
 * The site's mailing-list forms. Every POST works both as JSON (fetch) and as a plain browser form
 * post, which is answered with a 303 to the matching page.
 */
@ApiTags('public')
@Controller('api/public')
@UseFilters(PublicExceptionFilter)
export class PublicSubscribeController {
  constructor(
    private readonly subscribers: SubscribersService,
    private readonly config: AppConfig,
  ) {}

  @Post('subscribe')
  @HttpCode(200)
  @Limit('subscribe')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'Subscribe (double opt-in): e-mails a confirm link. The answer never says whether the address was already on the list.' })
  @ApiOkResponse({ type: SubscribeResultDto })
  @ApiBadRequestResponse({ schema: { example: { ok: false, errors: { email: 'Please enter a valid e-mail address' } } } })
  @ApiTooManyRequestsResponse({ schema: { example: { ok: false, error: 'Too many requests.' } } })
  async subscribe(@Body() dto: SubscribeDto, @Req() req: Request, @Res() res: Response) {
    // Bots fill every field; pretend success so they don't adapt, but store and send nothing.
    if (!dto.website) await this.subscribers.subscribe(dto, hashIp(clientIp(req, this.config.get('CLIENT_IP_HEADER')), this.config.get('JWT_SECRET_KEY')));
    if (wantsHtml(req)) return res.redirect(303, '/subscribe/?sent=1');
    return res.json({ ok: true, message: SUBSCRIBE_MESSAGE } satisfies SubscribeResultDto);
  }

  @Post('subscribe/confirm')
  @HttpCode(200)
  @Limit('subscribe')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'Confirm a subscription with the token from the e-mail (a POST, so link scanners cannot confirm it)' })
  @ApiOkResponse({ type: ConfirmResultDto })
  async confirm(@Body() dto: TokenDto, @Req() req: Request, @Res() res: Response) {
    const out = await this.subscribers.confirm(dto.token);
    if (wantsHtml(req)) return res.redirect(303, manageUrl(out.manageToken, '&confirmed=1'));
    return res.json(out);
  }

  @Get('subscribe/manage')
  @ApiOkResponse({ type: SubscriptionDto })
  @ApiQuery({ name: 'token' })
  subscription(@Query('token') token: string) {
    return this.subscribers.subscription(String(token ?? ''));
  }

  @Post('subscribe/manage')
  @HttpCode(200)
  @Limit('subscribe')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'Change topics or name, unsubscribe or re-subscribe' })
  @ApiOkResponse({ type: SubscriptionDto })
  async manage(@Body() dto: ManageSubscriptionDto, @Req() req: Request, @Res() res: Response) {
    const out = await this.subscribers.manage(dto);
    if (wantsHtml(req)) return res.redirect(303, manageUrl(dto.token, `&saved=${dto.action}`));
    return res.json(out);
  }

  /**
   * One-click unsubscribe (RFC 8058): mail clients POST `List-Unsubscribe=One-Click` to the URL in the
   * List-Unsubscribe header, with the token in the query string.
   */
  @Post('unsubscribe')
  @HttpCode(200)
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOkResponse({ type: OkDto })
  @ApiQuery({ name: 'token' })
  async oneClick(@Query('token') token: string, @Req() req: Request, @Res() res: Response) {
    await this.subscribers.unsubscribeByToken(String(token ?? ''));
    if (wantsHtml(req)) return res.redirect(303, manageUrl(String(token), '&saved=unsubscribe'));
    return res.json({ ok: true });
  }
}

@ApiTags('subscribers')
@Controller('api/admin/subscribers')
export class AdminSubscribersController {
  constructor(private readonly subscribers: SubscribersService) {}

  @Get()
  @Staff()
  @ApiOkResponse({ type: SubscriberPageDto })
  list(@Query() q: SubscriberQueryDto) {
    return this.subscribers.list(q);
  }

  @Get('counts')
  @Staff()
  @ApiOkResponse({ type: SubscriberCountsDto })
  counts() {
    return this.subscribers.counts();
  }

  @Get('export.csv')
  @Staff()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="subscribers.csv"')
  @ApiProduces('text/csv')
  @ApiOkResponse({ schema: { type: 'string' } })
  csv(@Query() q: SubscriberFilterDto) {
    return this.subscribers.csv(q);
  }

  @Post('import')
  @HttpCode(200)
  @Staff('admin')
  @ApiOkResponse({ type: ImportResultDto })
  import(@Body() dto: ImportSubscribersDto) {
    return this.subscribers.import(dto.csv, dto.consented);
  }

  @Patch(':id')
  @Staff()
  @ApiOkResponse({ type: SubscriberDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSubscriberDto) {
    return this.subscribers.update(id, dto);
  }

  @Post(':id/resend-confirm')
  @HttpCode(200)
  @Staff()
  @ApiOkResponse({ type: OkDto })
  async resend(@Param('id', ParseIntPipe) id: number) {
    await this.subscribers.resendConfirm(id);
    return { ok: true };
  }

  @Delete(':id')
  @Staff('admin')
  @ApiOkResponse({ type: OkDto })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.subscribers.remove(id);
    return { ok: true };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Subscriber])],
  controllers: [PublicSubscribeController, AdminSubscribersController],
  providers: [SubscribersService],
  exports: [SubscribersService],
})
export class SubscribersModule {}
