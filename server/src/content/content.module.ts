import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostStat } from '../engagement/engagement.entities';
import { FeedbackModule } from '../feedback/feedback.module';
import { BlogSetting } from '../settings/blog-setting.entity';
import { CodeFetchService } from './code-fetch.service';
import { ContentController } from './content.controller';
import { Author, Media, Page, Post, Topic } from './content.entities';
import { ContentService } from './content.service';
import { MediaService } from './media.service';
import { OgImageService } from './og-image.service';
import { PublicContentController, PublicMediaController, PublicOgImageController } from './public-content.controller';
import { SiteContentService } from './site-content.service';
import { TransferService } from './transfer/transfer.service';

/** Blog content (posts, topics, authors, pages, site settings, media) and its import/export. */
@Module({
  imports: [TypeOrmModule.forFeature([Post, Topic, Author, Page, Media, BlogSetting, PostStat]), FeedbackModule],
  controllers: [ContentController, PublicContentController, PublicMediaController, PublicOgImageController],
  providers: [ContentService, MediaService, SiteContentService, CodeFetchService, TransferService, OgImageService],
  exports: [ContentService, MediaService, SiteContentService, TransferService],
})
export class ContentModule {}
