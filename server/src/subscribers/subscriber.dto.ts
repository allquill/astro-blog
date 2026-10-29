import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PageMeta } from '../common/dto';
import { SUBSCRIBER_STATUSES, type SubscriberStatus } from './subscriber.entity';

/** A no-JS form sends one `topics` value as a string and several as an array; JSON sends an array. */
const toList = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? [] : (Array.isArray(value) ? value : String(value).split(',')).map((v) => String(v).trim()).filter(Boolean);

const TOPIC = /^[a-z0-9][a-z0-9-]{0,79}$/;

export class SubscribeDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsNotEmpty({ message: 'Please enter your e-mail address' }) @IsEmail({}, { message: 'Please enter a valid e-mail address' }) @MaxLength(254)
  email: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ type: [String], description: 'Topic slugs; empty = all topics' })
  @Transform(toList) @ArrayMaxSize(50) @Matches(TOPIC, { each: true, message: 'Unknown topic' })
  topics: string[] = [];

  @ApiPropertyOptional({ description: 'Page the form was on' }) @IsOptional() @IsString() @MaxLength(120)
  source?: string;

  @ApiPropertyOptional({ description: 'Honeypot: must stay empty' }) @IsOptional() @IsString()
  website?: string;
}

export class TokenDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80)
  token: string;
}

export const MANAGE_ACTIONS = ['update', 'unsubscribe', 'resubscribe'] as const;

export class ManageSubscriptionDto extends TokenDto {
  @ApiProperty({ enum: MANAGE_ACTIONS }) @IsIn(MANAGE_ACTIONS)
  action: (typeof MANAGE_ACTIONS)[number] = 'update';

  @ApiPropertyOptional({ type: [String] })
  @Transform(toList) @ArrayMaxSize(50) @Matches(TOPIC, { each: true, message: 'Unknown topic' })
  topics: string[] = [];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120)
  name?: string;
}

export class SubscribeResultDto {
  @ApiProperty({ example: true }) ok: boolean;
  @ApiProperty() message: string;
}

export class ConfirmResultDto {
  @ApiProperty({ example: true }) ok: boolean;
  @ApiProperty({ description: 'Token for the manage-preferences page' }) manageToken: string;
}

export class TopicOptionDto {
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
}

export class SubscriptionDto {
  @ApiProperty({ example: true }) ok: boolean;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: SUBSCRIBER_STATUSES }) status: SubscriberStatus;
  @ApiProperty({ type: [String] }) topics: string[];
  @ApiProperty({ type: [TopicOptionDto] }) allTopics: TopicOptionDto[];
}

// ----------------------------------------------------------------------------------- admin

export class SubscriberDto {
  @ApiProperty() id: number;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: SUBSCRIBER_STATUSES }) status: SubscriberStatus;
  @ApiProperty({ type: [String] }) topics: string[];
  @ApiProperty() source: string;
  @ApiProperty({ nullable: true, type: Number }) confirmedAt: number | null;
  @ApiProperty({ nullable: true, type: Number }) unsubscribedAt: number | null;
  @ApiProperty() createdAt: Date;
}

export class SubscriberPageDto extends PageMeta {
  @ApiProperty({ type: [SubscriberDto] }) data: SubscriberDto[];
}

export class UpdateSubscriberDto {
  @ApiPropertyOptional({ enum: SUBSCRIBER_STATUSES }) @IsOptional() @IsIn(SUBSCRIBER_STATUSES)
  status?: SubscriberStatus;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @ArrayMaxSize(50) @Matches(TOPIC, { each: true, message: 'Unknown topic' })
  topics?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120)
  name?: string;
}

export class ImportSubscribersDto {
  @ApiProperty({ description: 'CSV text with an "email" column (and optionally "name", "topics" separated by ";")' })
  @IsString() @IsNotEmpty() @MaxLength(2_000_000)
  csv: string;

  @ApiProperty({
    description: 'true = add as active (you already hold their consent); false = add as pending and send each a confirm e-mail',
  })
  @IsBoolean()
  consented: boolean;
}

export class ImportResultDto {
  @ApiProperty() added: number;
  @ApiProperty() skipped: number;
  @ApiProperty({ type: [String] }) invalid: string[];
}

export class SubscriberCountsDto {
  @ApiProperty() pending: number;
  @ApiProperty() active: number;
  @ApiProperty() unsubscribed: number;
  @ApiProperty() bounced: number;
}

export class SubscriberFilterDto {
  @ApiPropertyOptional({ description: 'Search e-mail and name' }) @IsOptional() @IsString() @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ enum: SUBSCRIBER_STATUSES }) @IsOptional() @IsIn(SUBSCRIBER_STATUSES)
  status?: SubscriberStatus;

  @ApiPropertyOptional({ description: 'Topic slug (subscribers to all topics match too)' }) @IsOptional() @Matches(TOPIC)
  topic?: string;
}

export class SubscriberQueryDto extends SubscriberFilterDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50, maximum: 200 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  pageSize?: number;
}
