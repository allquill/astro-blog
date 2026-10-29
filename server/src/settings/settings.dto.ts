import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsBoolean, IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SettingsDto {
  @ApiProperty({ description: 'Blog name used in e-mail subjects and signatures' })
  @IsString() @IsNotEmpty() @MaxLength(120)
  blogName: string;

  @ApiProperty({ type: [String], description: 'Who is e-mailed about new feedback (and new subscribers, when on)' })
  @IsEmail({}, { each: true }) @ArrayMaxSize(20)
  notifyTo: string[];

  @ApiProperty({ description: 'E-mail the notify list when feedback with a message arrives' })
  @IsBoolean()
  notifyOnFeedback: boolean;

  @ApiProperty({ description: 'E-mail the notify list when someone confirms a subscription' })
  @IsBoolean()
  notifyOnSubscribe: boolean;

  @ApiProperty({ description: 'Thank readers who leave an e-mail address with their feedback' })
  @IsBoolean()
  acknowledgeFeedback: boolean;

  @ApiProperty({ description: 'Send a welcome e-mail once a subscription is confirmed' })
  @IsBoolean()
  sendWelcome: boolean;

  @ApiProperty({ description: 'Appended to every e-mail to readers' })
  @IsString() @MaxLength(500)
  signature: string;

  @ApiProperty({ description: 'Shown at the bottom of every digest, above the unsubscribe link (e.g. your postal address)' })
  @IsString() @MaxLength(500)
  digestFooter: string;
}
