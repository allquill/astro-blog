import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { THROTTLERS } from './common/ip-throttler.guard';
import { AppConfigModule } from './config/app-config.service';
import { validate } from './config/env.validation';
import { DashboardModule } from './dashboard/dashboard';
import { DatabaseModule } from './database/database.module';
import { DigestsModule } from './digests/digests.module';
import { DocsModule } from './docs/docs.module';
import { EngagementModule } from './engagement/engagement.module';
import { FeedbackModule } from './feedback/feedback.module';
import { SiteFeedModule } from './feed/site-feed.service';
import { HealthController } from './health.controller';
import { MailModule } from './mail/mail.module';
import { SettingsModule } from './settings/settings.module';
import { SubscribersModule } from './subscribers/subscribers.module';

@Module({
  imports: [
    // server/.env is loaded here in development; in Docker the env comes from compose.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', validate }),
    AppConfigModule,
    // Only routes with @Limit() (IpThrottlerGuard) are limited; each skips the limits that aren't its own.
    ThrottlerModule.forRoot({ throttlers: Object.entries(THROTTLERS).map(([name, t]) => ({ name, ...t })) }),
    DatabaseModule,
    MailModule,
    SiteFeedModule,
    SettingsModule,
    AuthModule,
    EngagementModule,
    SubscribersModule,
    FeedbackModule,
    DigestsModule,
    DashboardModule,
    DocsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
