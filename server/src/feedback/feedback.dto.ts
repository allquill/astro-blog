import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { PageMeta, PageQuery } from '../common/dto';
import { Feedback, FEEDBACK_KINDS, FEEDBACK_STATUSES, type FeedbackKind, type FeedbackStatus } from './feedback.entity';

const blankToUndefined = ({ value }: { value: unknown }) => (value === '' || value === null ? undefined : value);

export class CreateFeedbackDto {
  @ApiPropertyOptional({ description: 'Slug of the post the feedback is about; empty = general feedback' })
  @Transform(blankToUndefined) @IsOptional() @Matches(/^[a-z0-9][a-z0-9-]{0,119}$/, { message: 'Unknown post' })
  postSlug?: string;

  @ApiPropertyOptional({ description: 'Answer to "Was this helpful?"' })
  // A no-JS form sends "yes" / "no".
  @Transform(({ value }) => (value === 'yes' || value === 'true' || value === true ? true : value === 'no' || value === 'false' || value === false ? false : undefined))
  @IsOptional() @IsBoolean()
  helpful?: boolean;

  @ApiPropertyOptional() @Transform(blankToUndefined) @IsOptional() @IsString() @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'Only needed for a reply' })
  @Transform(({ value }) => (typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined))
  @IsOptional() @IsEmail({}, { message: 'Please enter a valid e-mail address' }) @MaxLength(254)
  email?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((o: CreateFeedbackDto) => o.helpful === undefined)
  @IsNotEmpty({ message: 'Please write a message' }) @IsString() @MaxLength(5000)
  message?: string;

  @ApiPropertyOptional({ description: 'Honeypot: must stay empty' }) @IsOptional() @IsString()
  website?: string;
}

export class CreateFeedbackResultDto {
  @ApiProperty({ example: true }) ok: boolean;
  @ApiProperty({ description: 'Id to attach a message to a vote just sent', nullable: true, type: Number }) id: number | null;
}

export class FeedbackDto extends Feedback {
  @ApiPropertyOptional({ description: 'Title of the post, from the site feed', nullable: true, type: String }) postTitle: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) postUrl: string | null;
}

export class FeedbackPageDto extends PageMeta {
  @ApiProperty({ type: [FeedbackDto] }) data: FeedbackDto[];
}

export class UpdateFeedbackDto {
  @ApiProperty({ enum: FEEDBACK_STATUSES }) @IsIn(FEEDBACK_STATUSES)
  status: FeedbackStatus;
}

export class ReplyFeedbackDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Please write a reply' }) @MaxLength(10_000)
  message: string;
}

export class FeedbackCountsDto {
  @ApiProperty() new: number;
  @ApiProperty() total: number;
  @ApiProperty() helpful: number;
  @ApiProperty() notHelpful: number;
}

export class FeedbackMessageDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Please write a message' }) @IsString() @MaxLength(5000)
  message: string;

  @ApiPropertyOptional() @Transform(blankToUndefined) @IsOptional() @IsString() @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined))
  @IsOptional() @IsEmail({}, { message: 'Please enter a valid e-mail address' }) @MaxLength(254)
  email?: string;
}

export class FeedbackQueryDto extends PageQuery {
  @ApiPropertyOptional({ enum: FEEDBACK_STATUSES, description: 'Default: everything but archived and spam' }) @IsOptional() @IsIn(FEEDBACK_STATUSES)
  status?: FeedbackStatus;

  @ApiPropertyOptional({ enum: FEEDBACK_KINDS }) @IsOptional() @IsIn(FEEDBACK_KINDS)
  kind?: FeedbackKind;

  @ApiPropertyOptional({ description: 'Post slug' }) @IsOptional() @IsString() @MaxLength(120)
  post?: string;

  @ApiPropertyOptional({ description: 'Search message, name and e-mail' }) @IsOptional() @IsString() @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ description: 'Only feedback with a message (not bare votes)' })
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsOptional() @IsBoolean()
  withMessage?: boolean;
}
