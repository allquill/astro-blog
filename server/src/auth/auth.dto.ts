import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ADMIN_ROLES, type AdminRole } from './admin-user.entity';

export class LoginDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) username: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) password: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() @MaxLength(200) current: string;
  @ApiProperty() @IsString() @MaxLength(200) password: string;
}

export class AcceptInviteDto {
  @ApiProperty() @IsString() @MaxLength(200) token: string;
  @ApiProperty() @IsString() @MaxLength(200) password: string;
}

export class MeDto {
  @ApiProperty() id: number;
  @ApiProperty() username: string;
  @ApiProperty({ enum: ADMIN_ROLES }) role: AdminRole;
}

export class InviteInfoDto {
  @ApiProperty() username: string;
  @ApiProperty({ description: 'true = password reset for an existing user; false = first-time invite' }) reset: boolean;
  @ApiProperty() minLength: number;
}

export class UserDto {
  @ApiProperty() id: number;
  @ApiProperty() username: string;
  @ApiPropertyOptional({ type: String, nullable: true }) email: string | null;
  @ApiProperty({ enum: ADMIN_ROLES }) role: AdminRole;
  @ApiProperty({ enum: ['active', 'invited', 'invite expired', 'disabled'] }) status: string;
  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Epoch ms' }) lastLoginAt: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Epoch ms' }) inviteExpiresAt: number | null;
  @ApiProperty() createdAt: Date;
}

export class InviteUserDto {
  @ApiProperty() @IsString() @MaxLength(60) username: string;
  @ApiProperty() @IsEmail() @MaxLength(254) email: string;
  @ApiProperty({ enum: ADMIN_ROLES }) @IsIn(ADMIN_ROLES) role: AdminRole;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: ADMIN_ROLES }) @IsOptional() @IsIn(ADMIN_ROLES) role?: AdminRole;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() disabled?: boolean;
}

export class UserLinkDto {
  @ApiProperty({ type: UserDto }) user: UserDto;
  @ApiProperty({ description: 'The invite / reset link, to copy if the e-mail did not arrive' }) link: string;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Why the e-mail could not be sent' }) mailError: string | null;
}

export class AssignableUserDto {
  @ApiProperty() id: number;
  @ApiProperty() username: string;
  @ApiProperty({ enum: ADMIN_ROLES }) role: AdminRole;
}
