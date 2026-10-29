import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Module, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUsersService } from '../auth/admin-users.service';
import { AuthModule } from '../auth/auth.module';
import { type AdminRequest, Staff } from '../auth/guards';
import { OkDto } from '../common/dto';
import { Subscriber } from '../subscribers/subscriber.entity';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { AudienceDto, CreateDigestDto, DeliveryPageDto, DeliveryQueryDto, DigestDto, DigestPreviewDto, TestDigestDto, UpdateDigestDto } from './digest.dto';
import { Digest, DigestDelivery } from './digest.entities';
import { DigestsService } from './digests.service';

@ApiTags('digests')
@Controller('api/admin/digests')
export class DigestsController {
  constructor(
    private readonly digests: DigestsService,
    private readonly users: AdminUsersService,
  ) {}

  @Get()
  @Staff()
  @ApiOkResponse({ type: [DigestDto] })
  list() {
    return this.digests.list();
  }

  @Get('audience')
  @Staff()
  @ApiOkResponse({ type: AudienceDto })
  @ApiQuery({ name: 'post', description: 'Post slug' })
  audience(@Query('post') post: string) {
    return this.digests.audience(String(post ?? ''));
  }

  @Post()
  @Staff()
  @ApiOkResponse({ type: DigestDto })
  create(@Body() dto: CreateDigestDto, @Req() req: AdminRequest) {
    return this.digests.create(dto, req.user!.username);
  }

  @Get(':id')
  @Staff()
  @ApiOkResponse({ type: DigestDto })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.digests.get(id);
  }

  @Patch(':id')
  @Staff()
  @ApiOkResponse({ type: DigestDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDigestDto) {
    return this.digests.update(id, dto);
  }

  @Get(':id/preview')
  @Staff()
  @ApiOkResponse({ type: DigestPreviewDto })
  preview(@Param('id', ParseIntPipe) id: number) {
    return this.digests.preview(id);
  }

  @Post(':id/test')
  @HttpCode(200)
  @Staff()
  @ApiOkResponse({ type: OkDto })
  async test(@Param('id', ParseIntPipe) id: number, @Body() dto: TestDigestDto, @Req() req: AdminRequest) {
    const to = dto.to ?? (await this.users.findById(req.user!.id))?.email;
    if (!to) throw new BadRequestException({ message: 'Your account has no e-mail address; enter one.', errors: { to: 'Enter an address' } });
    await this.digests.test(id, to);
    return { ok: true };
  }

  @Post(':id/send')
  @HttpCode(200)
  @Staff('admin')
  @ApiOkResponse({ type: DigestDto })
  send(@Param('id', ParseIntPipe) id: number) {
    return this.digests.send(id);
  }

  @Get(':id/deliveries')
  @Staff()
  @ApiOkResponse({ type: DeliveryPageDto })
  deliveries(@Param('id', ParseIntPipe) id: number, @Query() q: DeliveryQueryDto) {
    return this.digests.deliveryPage(id, q);
  }

  @Delete(':id')
  @Staff('admin')
  @ApiOkResponse({ type: OkDto })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.digests.remove(id);
    return { ok: true };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Digest, DigestDelivery, Subscriber]), SubscribersModule, AuthModule],
  controllers: [DigestsController],
  providers: [DigestsService],
})
export class DigestsModule {}
