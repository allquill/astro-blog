import { BadRequestException, Body, Controller, Get, GoneException, HttpCode, Post, Query, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiOkResponse, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AppConfig } from '../config/app-config.service';
import { IpThrottlerGuard } from '../common/ip-throttler.guard';
import { OkDto } from '../common/dto';
import { AdminUsersService, MIN_PASSWORD_LENGTH } from './admin-users.service';
import { AcceptInviteDto, ChangePasswordDto, InviteInfoDto, LoginDto, MeDto } from './auth.dto';
import { type AdminRequest, SameOriginGuard, Staff } from './guards';
import { ADMIN_COOKIE, type AdminJwtPayload } from './jwt.strategy';

/** Sign-in for the admin SPA. The JWT lives in an HttpOnly cookie scoped to /api. */
@ApiTags('auth')
@Controller('api/auth')
// Only routes that add IpThrottlerGuard are rate-limited; here that is the 'login' limit only.
@SkipThrottle({ engage: true, subscribe: true, feedback: true })
export class AuthController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  /** Signs a JWT (JWT_SECRET_KEY, JWT_TOKEN_EXPIRE_TIME) and stores it in the admin cookie. */
  private async issueToken(res: Response, user: { id: number; username: string; passwordChangedAt: number }) {
    const token = await this.jwt.signAsync({ sub: user.id, username: user.username, pwc: user.passwordChangedAt });
    const { iat, exp } = this.jwt.decode<AdminJwtPayload>(token);
    res.cookie(ADMIN_COOKIE, token, {
      path: '/api',
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE'),
      // Lax so links from e-mails ("Open in admin") arrive signed in; cross-site POSTs still carry no
      // cookie, and every state-changing call is Origin-checked as well (SameOriginGuard).
      sameSite: 'lax',
      maxAge: (exp - iat) * 1000,
    });
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(SameOriginGuard, IpThrottlerGuard)
  @ApiOkResponse({ type: MeDto })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts; try again in 15 minutes' })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response): Promise<MeDto> {
    const user = await this.users.verify(body.username, body.password);
    if (!user) throw new UnauthorizedException('Incorrect username or password.');
    await this.issueToken(res, user);
    return { id: user.id, username: user.username, role: user.role };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(SameOriginGuard)
  @ApiOkResponse({ type: OkDto })
  logout(@Res({ passthrough: true }) res: Response): OkDto {
    res.clearCookie(ADMIN_COOKIE, { path: '/api' });
    return { ok: true };
  }

  /** The signed-in user; 401 when not signed in (the SPA then shows the login page). */
  @Get('me')
  @Staff()
  @ApiOkResponse({ type: MeDto })
  me(@Req() req: AdminRequest): MeDto {
    return req.user!;
  }

  @Post('password')
  @HttpCode(200)
  @Staff()
  @ApiOkResponse({ type: OkDto })
  async changePassword(@Req() req: AdminRequest, @Body() body: ChangePasswordDto, @Res({ passthrough: true }) res: Response): Promise<OkDto> {
    const user = await this.users.findById(req.user!.id);
    if (!user || !(await this.users.checkPassword(user, body.current))) throw new BadRequestException('Your current password is incorrect.');
    if (body.password.length < MIN_PASSWORD_LENGTH) throw new BadRequestException(`The new password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (await this.users.checkPassword(user, body.password)) throw new BadRequestException('Choose a password different from the current one.');
    // Other sessions are logged out (their tokens carry the old passwordChangedAt); this one gets a new token.
    await this.issueToken(res, await this.users.setPassword(user, body.password));
    return { ok: true };
  }

  // ------------------------------------------------------------ invite / reset links (public)

  @Get('invite')
  @ApiOkResponse({ type: InviteInfoDto })
  async inviteInfo(@Query('token') token: string): Promise<InviteInfoDto> {
    const user = await this.users.findByInviteToken(token);
    if (!user) throw new GoneException('This link has expired or was already used. Ask an admin for a new one.');
    return { username: user.username, reset: Boolean(user.passwordHash), minLength: MIN_PASSWORD_LENGTH };
  }

  @Post('invite')
  @HttpCode(200)
  @UseGuards(SameOriginGuard, IpThrottlerGuard)
  @ApiOkResponse({ type: MeDto })
  async acceptInvite(@Body() body: AcceptInviteDto, @Res({ passthrough: true }) res: Response): Promise<MeDto> {
    const user = await this.users.findByInviteToken(body.token);
    if (!user) throw new GoneException('This link has expired or was already used. Ask an admin for a new one.');
    if (body.password.length < MIN_PASSWORD_LENGTH) throw new BadRequestException(`The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    const updated = await this.users.setPassword(user, body.password);
    await this.issueToken(res, updated);
    return { id: user.id, username: user.username, role: user.role };
  }
}
