import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { StringValue } from 'ms';
import { AppConfig } from '../config/app-config.service';
import { MailModule } from '../mail/mail.module';
import { AdminSeedService } from './admin-seed.service';
import { AdminUser } from './admin-user.entity';
import { AdminUsersService } from './admin-users.service';
import { AuthController } from './auth.controller';
import { AdminAuthGuard, RolesGuard, SameOriginGuard } from './guards';
import { AdminJwtStrategy } from './jwt.strategy';
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser]),
    PassportModule,
    // Admin tokens: HS256 JWTs signed with JWT_SECRET_KEY, valid for JWT_TOKEN_EXPIRE_TIME (like ef-backend).
    JwtModule.registerAsync({
      inject: [AppConfig],
      useFactory: (c: AppConfig) => ({
        secret: c.get('JWT_SECRET_KEY'),
        signOptions: { expiresIn: c.get('JWT_TOKEN_EXPIRE_TIME').replace(/\s+/g, '') as StringValue, algorithm: 'HS256' },
      }),
    }),
    MailModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [AdminUsersService, AdminSeedService, AdminJwtStrategy, AdminAuthGuard, RolesGuard, SameOriginGuard],
  exports: [AdminUsersService, AdminAuthGuard, RolesGuard, SameOriginGuard],
})
export class AuthModule {}
