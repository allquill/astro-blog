import { Body, Controller, Delete, Get, HttpCode, Module, Param, Post, Query, Req, UseFilters } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Request } from 'express';
import { AppConfig } from '../config/app-config.service';
import { Limit } from '../common/ip-throttler.guard';
import { PublicExceptionFilter } from '../common/public-exception.filter';
import { clientIp } from '../common/request-context';
import { hashIp } from '../common/security';
import { PostCountsDto, PostStatsDto, ShareDto } from './engagement.dto';
import { PostLike, PostStat } from './engagement.entities';
import { EngagementService } from './engagement.service';

/** Likes and share counts for the website's post pages. */
@ApiTags('public')
@Controller('api/public')
@UseFilters(PublicExceptionFilter)
export class EngagementController {
  constructor(
    private readonly engagement: EngagementService,
    private readonly config: AppConfig,
  ) {}

  /** A stable, salted visitor hash (IP + user agent); raw addresses are never stored. */
  private visitor(req: Request) {
    const ip = clientIp(req, this.config.get('CLIENT_IP_HEADER'));
    return hashIp(`${ip}|${req.headers['user-agent'] ?? ''}`, this.config.get('JWT_SECRET_KEY'));
  }

  @Get('stats')
  @ApiOperation({ summary: 'Like and share counts for several posts (list pages)' })
  @ApiOkResponse({ type: [PostCountsDto] })
  @ApiQuery({ name: 'slugs', description: 'Comma-separated post slugs (up to 100)' })
  counts(@Query('slugs') slugs = '') {
    return this.engagement.counts(String(slugs).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 100));
  }

  @Get('posts/:slug/stats')
  @ApiOkResponse({ type: PostStatsDto })
  stats(@Param('slug') slug: string, @Req() req: Request) {
    return this.engagement.forVisitor(slug, this.visitor(req));
  }

  @Post('posts/:slug/like')
  @HttpCode(200)
  @Limit('engage')
  @ApiOkResponse({ type: PostStatsDto })
  @ApiTooManyRequestsResponse({ schema: { example: { ok: false, error: 'Too many requests.' } } })
  like(@Param('slug') slug: string, @Req() req: Request) {
    return this.engagement.setLike(slug, this.visitor(req), true);
  }

  @Delete('posts/:slug/like')
  @Limit('engage')
  @ApiOkResponse({ type: PostStatsDto })
  unlike(@Param('slug') slug: string, @Req() req: Request) {
    return this.engagement.setLike(slug, this.visitor(req), false);
  }

  @Post('posts/:slug/share')
  @HttpCode(200)
  @Limit('engage')
  @ApiOperation({ summary: 'Count a share-button click (the share itself happens on the network)' })
  @ApiOkResponse({ type: PostStatsDto })
  share(@Param('slug') slug: string, @Body() body: ShareDto, @Req() req: Request) {
    return this.engagement.share(slug, body.network, this.visitor(req));
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([PostStat, PostLike])],
  controllers: [EngagementController],
  providers: [EngagementService],
  exports: [EngagementService],
})
export class EngagementModule {}
