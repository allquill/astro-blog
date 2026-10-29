import { Body, Controller, Delete, Get, HttpCode, Module, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UseFilters } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Request, Response } from 'express';
import { type AdminRequest, Staff } from '../auth/guards';
import { AppConfig } from '../config/app-config.service';
import { OkDto } from '../common/dto';
import { Limit } from '../common/ip-throttler.guard';
import { PublicExceptionFilter } from '../common/public-exception.filter';
import { clientIp, wantsHtml } from '../common/request-context';
import { hashIp } from '../common/security';
import {
  CreateFeedbackDto, CreateFeedbackResultDto, FeedbackCountsDto, FeedbackDto, FeedbackMessageDto, FeedbackPageDto, FeedbackQueryDto, ReplyFeedbackDto, UpdateFeedbackDto,
} from './feedback.dto';
import { Feedback } from './feedback.entity';
import { FeedbackService } from './feedback.service';

@ApiTags('public')
@Controller('api/public/feedback')
@UseFilters(PublicExceptionFilter)
export class PublicFeedbackController {
  constructor(
    private readonly feedback: FeedbackService,
    private readonly config: AppConfig,
  ) {}

  private ipHash(req: Request) {
    return hashIp(clientIp(req, this.config.get('CLIENT_IP_HEADER')), this.config.get('JWT_SECRET_KEY'));
  }

  @Post()
  @HttpCode(200)
  @Limit('feedback')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'A "was this helpful?" vote and/or a message, about a post or the blog in general' })
  @ApiOkResponse({ type: CreateFeedbackResultDto })
  @ApiBadRequestResponse({ schema: { example: { ok: false, errors: { message: 'Please write a message' } } } })
  async create(@Body() dto: CreateFeedbackDto, @Req() req: Request, @Res() res: Response) {
    const f = dto.website ? null : await this.feedback.create(dto, this.ipHash(req));
    if (wantsHtml(req)) return res.redirect(303, dto.postSlug ? `/blog/${dto.postSlug}/?feedback=1#feedback` : '/feedback/?sent=1');
    return res.json({ ok: true, id: f?.id ?? null } satisfies CreateFeedbackResultDto);
  }

  @Post(':id/message')
  @HttpCode(200)
  @Limit('feedback')
  @ApiOperation({ summary: 'Add a message to the vote this visitor just sent' })
  @ApiOkResponse({ type: OkDto })
  async attach(@Param('id', ParseIntPipe) id: number, @Body() dto: FeedbackMessageDto, @Req() req: Request) {
    await this.feedback.attachMessage(id, dto, this.ipHash(req));
    return { ok: true };
  }
}

@ApiTags('feedback')
@Controller('api/admin/feedback')
export class AdminFeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  @Staff()
  @ApiOkResponse({ type: FeedbackPageDto })
  list(@Query() q: FeedbackQueryDto) {
    return this.feedback.list(q);
  }

  @Get('counts')
  @Staff()
  @ApiOkResponse({ type: FeedbackCountsDto })
  counts() {
    return this.feedback.counts();
  }

  @Get(':id')
  @Staff()
  @ApiOkResponse({ type: FeedbackDto })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.feedback.get(id);
  }

  @Patch(':id')
  @Staff()
  @ApiOkResponse({ type: FeedbackDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFeedbackDto) {
    return this.feedback.setStatus(id, dto.status);
  }

  @Post(':id/reply')
  @HttpCode(200)
  @Staff()
  @ApiOkResponse({ type: FeedbackDto })
  reply(@Param('id', ParseIntPipe) id: number, @Body() dto: ReplyFeedbackDto, @Req() req: AdminRequest) {
    return this.feedback.reply(id, dto.message, req.user!.username);
  }

  @Delete(':id')
  @Staff('admin')
  @ApiOkResponse({ type: OkDto })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.feedback.remove(id);
    return { ok: true };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Feedback])],
  controllers: [PublicFeedbackController, AdminFeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
