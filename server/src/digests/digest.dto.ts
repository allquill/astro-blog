import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PageMeta, PageQuery } from '../common/dto';
import { DELIVERY_STATUSES, type DeliveryStatus, Digest, DigestDelivery } from './digest.entities';

export class FeedPostDto {
  @ApiProperty() slug: string;
  @ApiProperty() url: string;
  @ApiProperty() title: string;
  @ApiProperty() summary: string;
  @ApiProperty({ nullable: true, type: String }) image: string | null;
  @ApiProperty() publishedAt: string;
  @ApiProperty() author: string;
  @ApiProperty({ type: [String] }) topics: string[];
  @ApiProperty({ type: [String] }) tags: string[];
}

export class DigestDto extends Digest {
  @ApiProperty({ type: FeedPostDto, nullable: true, description: 'The post as the site feed (or the send snapshot) describes it' })
  post: FeedPostDto | null;
}

export class CreateDigestDto {
  @ApiProperty() @Matches(/^[a-z0-9][a-z0-9-]{0,119}$/, { message: 'Choose a post' })
  postSlug: string;

  @ApiPropertyOptional({ description: 'Defaults to "New post: <title>"' }) @IsOptional() @IsString() @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000)
  intro?: string;
}

export class UpdateDigestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty({ message: 'A subject is required' }) @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000)
  intro?: string;
}

export class TestDigestDto {
  @ApiPropertyOptional({ description: 'Defaults to your own account e-mail' }) @IsOptional() @IsEmail({}, { message: 'Please enter a valid e-mail address' })
  to?: string;
}

export class DigestPreviewDto {
  @ApiProperty() subject: string;
  @ApiProperty() html: string;
  @ApiProperty() text: string;
  @ApiProperty({ description: 'Active subscribers whose topics match the post' }) audience: number;
}

export class AudienceDto {
  @ApiProperty() audience: number;
}

export class DeliveryPageDto extends PageMeta {
  @ApiProperty({ type: [DigestDelivery] }) data: DigestDelivery[];
}

export class DeliveryQueryDto extends PageQuery {
  @ApiPropertyOptional({ enum: DELIVERY_STATUSES }) @IsOptional() @IsIn(DELIVERY_STATUSES)
  status?: DeliveryStatus;
}
