import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { MoreThanOrEqual, type Repository } from 'typeorm';
import { Staff } from '../auth/guards';
import { PostLike, PostStat } from '../engagement/engagement.entities';
import { FeedbackCountsDto } from '../feedback/feedback.dto';
import { Feedback } from '../feedback/feedback.entity';
import { FeedbackModule } from '../feedback/feedback.module';
import { FeedbackService } from '../feedback/feedback.service';
import { SiteFeedService } from '../feed/site-feed.service';
import { SubscriberCountsDto } from '../subscribers/subscriber.dto';
import { Subscriber } from '../subscribers/subscriber.entity';
import { SubscribersModule } from '../subscribers/subscribers.module';
import { SubscribersService } from '../subscribers/subscribers.service';

export class CountDto {
  @ApiProperty() key: string;
  @ApiProperty() count: number;
}

export class TopPostDto {
  @ApiProperty() slug: string;
  @ApiProperty() title: string;
  @ApiProperty() likes: number;
  @ApiProperty() shares: number;
}

export class DashboardDto {
  @ApiProperty({ description: 'Published posts in the site feed' }) posts: number;
  @ApiProperty({ description: 'True when the API could not read the site feed (titles are missing)' }) feedUnavailable: boolean;
  @ApiProperty() likes: number;
  @ApiProperty() shares: number;
  @ApiProperty({ type: SubscriberCountsDto }) subscribers: SubscriberCountsDto;
  @ApiProperty({ type: FeedbackCountsDto }) feedback: FeedbackCountsDto;
  @ApiProperty({ type: [CountDto], description: 'Confirmed subscriptions per week, last 12 weeks (key = Monday, YYYY-MM-DD)' }) subscribersPerWeek: CountDto[];
  @ApiProperty({ type: [CountDto], description: 'Likes per day, last 30 days' }) likesPerDay: CountDto[];
  @ApiProperty({ type: [CountDto], description: 'Feedback per day, last 30 days' }) feedbackPerDay: CountDto[];
  @ApiProperty({ type: [CountDto], description: 'Share clicks by network, all time' }) sharesByNetwork: CountDto[];
  @ApiProperty({ type: [TopPostDto] }) topPosts: TopPostDto[];
}

export class AdminPostDto {
  @ApiProperty() slug: string;
  @ApiProperty() title: string;
  @ApiProperty() url: string;
  @ApiProperty() publishedAt: string;
  @ApiProperty() author: string;
  @ApiProperty({ type: [String] }) topics: string[];
  @ApiProperty() likes: number;
  @ApiProperty() shares: number;
  @ApiProperty() helpful: number;
  @ApiProperty() notHelpful: number;
  @ApiProperty() messages: number;
}

export class AdminPostsDto {
  @ApiProperty() feedUnavailable: boolean;
  @ApiProperty() feedUrl: string;
  @ApiProperty({ type: [AdminPostDto] }) data: AdminPostDto[];
  @ApiProperty({ type: () => [AdminTopicDto], description: 'Topics from the site feed' }) topics: AdminTopicDto[];
}

export class AdminTopicDto {
  @ApiProperty() slug: string;
  @ApiProperty() name: string;
  @ApiProperty() posts: number;
}

const DAY = 86_400_000;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Builds `days` buckets ending today and counts timestamps into them. */
function perDay(times: number[], days: number, now: number): CountDto[] {
  const m = new Map<string, number>();
  for (const t of times) m.set(isoDay(t), (m.get(isoDay(t)) ?? 0) + 1);
  return Array.from({ length: days }, (_, i) => {
    const key = isoDay(now - (days - 1 - i) * DAY);
    return { key, count: m.get(key) ?? 0 };
  });
}

/** Monday of the week (UTC) a time falls in. */
const weekOf = (t: number) => {
  const d = new Date(t);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.getTime();
};

/** Numbers for the admin home page. Computed in code over recent rows: small data, both drivers. */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(PostStat) private readonly stats: Repository<PostStat>,
    @InjectRepository(PostLike) private readonly likes: Repository<PostLike>,
    @InjectRepository(Feedback) private readonly feedbackRows: Repository<Feedback>,
    @InjectRepository(Subscriber) private readonly subscriberRows: Repository<Subscriber>,
    private readonly feedback: FeedbackService,
    private readonly subscribers: SubscribersService,
    private readonly feed: SiteFeedService,
  ) {}

  async get(): Promise<DashboardDto> {
    const now = Date.now();
    const since30 = new Date(now - 30 * DAY);
    const firstWeek = weekOf(now) - 11 * 7 * DAY;
    const [posts, stats, likes, fb, confirmed, subCounts, fbCounts] = await Promise.all([
      this.feed.allPosts(),
      this.stats.find(),
      this.likes.find({ where: { createdAt: MoreThanOrEqual(since30) }, select: { createdAt: true } }),
      this.feedbackRows.find({ where: { createdAt: MoreThanOrEqual(since30) }, select: { createdAt: true, status: true } }),
      this.subscriberRows.find({ where: { confirmedAt: MoreThanOrEqual(firstWeek) }, select: { confirmedAt: true } }),
      this.subscribers.counts(),
      this.feedback.counts(),
    ]);
    const titles = new Map(posts.map((p) => [p.slug, p.title]));

    const weeks = new Map<number, number>();
    for (const s of confirmed) weeks.set(weekOf(s.confirmedAt!), (weeks.get(weekOf(s.confirmedAt!)) ?? 0) + 1);
    const subscribersPerWeek = Array.from({ length: 12 }, (_, i) => {
      const w = firstWeek + i * 7 * DAY;
      return { key: isoDay(w), count: weeks.get(w) ?? 0 };
    });

    const networks = new Map<string, number>();
    for (const s of stats) {
      for (const [k, n] of Object.entries(JSON.parse(s.sharesByNetwork || '{}') as Record<string, number>)) networks.set(k, (networks.get(k) ?? 0) + n);
    }

    return {
      posts: posts.length,
      feedUnavailable: this.feed.unavailable,
      likes: stats.reduce((n, s) => n + s.likes, 0),
      shares: stats.reduce((n, s) => n + s.shares, 0),
      subscribers: subCounts,
      feedback: fbCounts,
      subscribersPerWeek,
      likesPerDay: perDay(likes.map((l) => new Date(l.createdAt).getTime()), 30, now),
      feedbackPerDay: perDay(fb.filter((f) => f.status !== 'spam').map((f) => new Date(f.createdAt).getTime()), 30, now),
      sharesByNetwork: [...networks.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
      topPosts: [...stats]
        .sort((a, b) => b.likes + b.shares - (a.likes + a.shares))
        .slice(0, 10)
        .map((s) => ({ slug: s.slug, title: titles.get(s.slug) ?? s.slug, likes: s.likes, shares: s.shares })),
    };
  }

  /** Every post on the site with its counters: content comes from the site feed, numbers from here. */
  async posts(): Promise<AdminPostsDto> {
    const [posts, topics, stats, votes] = await Promise.all([this.feed.allPosts(true), this.feed.allTopics(), this.stats.find(), this.feedback.perPost()]);
    const bySlug = new Map(stats.map((s) => [s.slug, s]));
    return {
      feedUnavailable: this.feed.unavailable,
      feedUrl: this.feed.url,
      data: posts.map((p) => {
        const s = bySlug.get(p.slug);
        const v = votes.get(p.slug);
        return {
          slug: p.slug, title: p.title, url: p.url, publishedAt: p.publishedAt, author: p.author, topics: p.topics,
          likes: s?.likes ?? 0, shares: s?.shares ?? 0, helpful: v?.helpful ?? 0, notHelpful: v?.notHelpful ?? 0, messages: v?.messages ?? 0,
        };
      }),
      topics: topics.map((t) => ({ slug: t.slug, name: t.name, posts: posts.filter((p) => p.topics.includes(t.slug)).length })),
    };
  }
}

@ApiTags('dashboard')
@Controller('api/admin')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('dashboard')
  @Staff()
  @ApiOkResponse({ type: DashboardDto })
  get() {
    return this.dashboard.get();
  }

  @Get('posts')
  @Staff()
  @ApiOkResponse({ type: AdminPostsDto })
  posts() {
    return this.dashboard.posts();
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([PostStat, PostLike, Feedback, Subscriber]), FeedbackModule, SubscribersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
