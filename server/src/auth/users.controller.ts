import { BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppConfig } from '../config/app-config.service';
import { OkDto } from '../common/dto';
import { MailService } from '../mail/mail.service';
import type { AdminUser } from './admin-user.entity';
import { AdminUsersService, UserRuleError, userStatus } from './admin-users.service';
import { AssignableUserDto, InviteUserDto, UpdateUserDto, UserDto, UserLinkDto } from './auth.dto';
import { type AdminRequest, Staff } from './guards';

/** User management — admins only (except the assignable list). Users are invited by e-mail and set their own password. */
@ApiTags('users')
@Controller('api/admin/users')
export class UsersController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly mail: MailService,
    private readonly config: AppConfig,
  ) {}

  private view(u: AdminUser): UserDto {
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      status: userStatus(u),
      lastLoginAt: u.lastLoginAt,
      inviteExpiresAt: u.inviteExpiresAt,
      createdAt: u.createdAt,
    };
  }

  private inviteLink(token: string) {
    return new URL(`/invite?token=${encodeURIComponent(token)}`, this.config.get('ADMIN_URL')).toString();
  }

  /** E-mails the link; returns the error instead of throwing so the admin can copy the link by hand. */
  private async sendLink(u: AdminUser, token: string, kind: 'invite' | 'reset', by: string): Promise<UserLinkDto> {
    let mailError: string | null = null;
    try {
      await this.mail.sendInvite({ username: u.username, email: u.email! }, this.inviteLink(token), kind, by);
    } catch (e) {
      mailError = (e as Error).message;
    }
    const fresh = (await this.users.findById(u.id))!;
    return { user: this.view(fresh), link: this.inviteLink(token), mailError };
  }

  /** Runs a user-management rule, turning a broken rule into a 400 with its message. */
  private async rule<T>(fn: () => Promise<T>) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof UserRuleError) throw new BadRequestException(e.message);
      throw e;
    }
  }

  private async target(id: number) {
    const u = await this.users.findById(id);
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  /** Active users feedback can be assigned to; readable by every staff member. */
  @Get('assignable')
  @Staff()
  @ApiOkResponse({ type: [AssignableUserDto] })
  async assignable(): Promise<AssignableUserDto[]> {
    return (await this.users.list())
      .filter((u) => userStatus(u) === 'active')
      .map((u) => ({ id: u.id, username: u.username, role: u.role }));
  }

  @Staff('admin')
  @Get()
  @ApiOkResponse({ type: [UserDto] })
  async list(): Promise<UserDto[]> {
    return (await this.users.list()).map((u) => this.view(u));
  }

  @Staff('admin')
  @Post()
  @ApiOkResponse({ type: UserLinkDto })
  async invite(@Req() req: AdminRequest, @Body() body: InviteUserDto): Promise<UserLinkDto> {
    const { user, token } = await this.rule(() => this.users.invite(body));
    return this.sendLink(user, token, 'invite', req.user!.username);
  }

  @Staff('admin')
  @Patch(':id')
  @ApiOkResponse({ type: UserDto })
  async update(@Req() req: AdminRequest, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateUserDto): Promise<UserDto> {
    const u = await this.target(id);
    await this.rule(async () => {
      if (body.role) await this.users.setRole(req.user!.id, u, body.role);
      if (body.disabled !== undefined) await this.users.setDisabled(req.user!.id, u, body.disabled);
    });
    return this.view((await this.users.findById(id))!);
  }

  /** New invite link (user without a password) or password-reset link (existing user). */
  @Staff('admin')
  @Post(':id/link')
  @HttpCode(200)
  @ApiOkResponse({ type: UserLinkDto })
  async link(@Req() req: AdminRequest, @Param('id', ParseIntPipe) id: number): Promise<UserLinkDto> {
    const u = await this.target(id);
    const token = await this.rule(() => this.users.reissueInvite(u));
    return this.sendLink(u, token, u.passwordHash ? 'reset' : 'invite', req.user!.username);
  }

  @Staff('admin')
  @Delete(':id')
  @ApiOkResponse({ type: OkDto })
  async remove(@Req() req: AdminRequest, @Param('id', ParseIntPipe) id: number): Promise<OkDto> {
    const u = await this.target(id);
    await this.rule(() => this.users.remove(req.user!.id, u));
    return { ok: true };
  }
}
