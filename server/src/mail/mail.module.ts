import { MailerModule, type MailerOptions } from '@nestjs-modules/mailer';
import { Global, Module } from '@nestjs/common';
import { AppConfig } from '../config/app-config.service';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [AppConfig],
      // Cast: the mailer's option types lag behind nodemailer's own typings.
      useFactory: (c: AppConfig) => ({
        transport: {
          host: c.get('SMTP_HOST'),
          port: c.get('SMTP_PORT'),
          secure: c.get('SMTP_SECURE'),
          auth: c.get('SMTP_USER') ? { user: c.get('SMTP_USER'), pass: c.get('SMTP_PASSWORD') } : undefined,
        },
        defaults: { from: c.get('MAIL_FROM') },
      }) as MailerOptions,
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
