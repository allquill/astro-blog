import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, type Repository } from 'typeorm';
import { SiteFeedService } from '../feed/site-feed.service';
import { MailService } from '../mail/mail.service';
import { SettingsService } from '../settings/settings.service';
import type { CreateFeedbackDto, FeedbackCountsDto, FeedbackDto, FeedbackMessageDto, FeedbackPageDto } from './feedback.dto';
import { Feedback, type FeedbackStatus } from './feedback.entity';

/** A vote can have a message added by the same visitor for this long. */
const ATTACH_WINDOW_MS = 60 * 60 * 1000;

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger('Feedback');

  constructor(
    @InjectRepository(Feedback) private readonly rows: Repository<Feedback>,
    private readonly feed: SiteFeedService,
    private readonly mail: MailService,
    private readonly settings: SettingsService,
  ) {}

  private async attempt(label: string, send: () => Promise<unknown>) {
    try {
      await send();
      return true;
    } catch (err) {
      this.logger.error(`${label} failed: ${(err as Error).message}`);
      return false;
    }
  }

  /** E-mails after saving, never holding up the response. Votes without a message notify nobody. */
  private async afterMessage(f: Feedback) {
    if (!f.message) return;
    const s = await this.settings.get();
    const post = f.postSlug ? await this.feed.post(f.postSlug) : null;
    if (s.notifyOnFeedback && s.notifyTo.length) {
      void this.attempt(`staff notice for feedback ${f.id}`, () => this.mail.newFeedback(f, post, s.notifyTo, s));
    }
    if (s.acknowledgeFeedback && f.email) {
      void this.attempt(`acknowledgement for feedback ${f.id}`, () => this.mail.acknowledgeFeedback(f, post, s));
    }
  }

  async create(dto: CreateFeedbackDto, ipHash: string) {
    if (dto.postSlug && !(await this.feed.isKnown(dto.postSlug))) {
      throw new BadRequestException({ message: 'Unknown post', errors: { postSlug: 'Unknown post' } });
    }
    const f = await this.rows.save(
      this.rows.create({
        kind: dto.postSlug ? 'post' : 'general',
        postSlug: dto.postSlug ?? null,
        helpful: dto.helpful ?? null,
        name: dto.name?.trim() ?? '',
        email: dto.email ?? '',
        message: dto.message ?? '',
        // A bare vote needs no one's attention.
        status: dto.message ? 'new' : 'read',
        ipHash,
      }),
    );
    void this.afterMessage(f);
    return f;
  }

  /** Adds the message to a vote the same visitor just sent (the post footer's two-step form). */
  async attachMessage(id: number, dto: FeedbackMessageDto, ipHash: string) {
    const f = await this.rows.findOneBy({ id });
    if (!f || f.ipHash !== ipHash || f.message || Date.now() - f.createdAt.getTime() > ATTACH_WINDOW_MS) {
      throw new NotFoundException('Please send your message with the feedback form.');
    }
    Object.assign(f, { message: dto.message, name: dto.name ?? f.name, email: dto.email ?? f.email, status: 'new' });
    await this.rows.save(f);
    void this.afterMessage(f);
  }

  // =============================================================================== admin

  private async views(rows: Feedback[]): Promise<FeedbackDto[]> {
    const posts = new Map((await this.feed.allPosts()).map((p) => [p.slug, p]));
    return rows.map(({ ipHash, ...f }) => {
      void ipHash; // never leaves the API
      const p = f.postSlug ? posts.get(f.postSlug) : undefined;
      return { ...f, ipHash: '', postTitle: p?.title ?? null, postUrl: p?.url ?? null };
    });
  }

  async list(q: { status?: string; kind?: string; q?: string; post?: string; withMessage?: boolean; page?: number; pageSize?: number }): Promise<FeedbackPageDto> {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 50));
    const qb = this.rows.createQueryBuilder('f');
    if (q.status) qb.andWhere('f.status = :status', { status: q.status });
    else qb.andWhere("f.status NOT IN ('archived', 'spam')");
    if (q.kind) qb.andWhere('f.kind = :kind', { kind: q.kind });
    if (q.post) qb.andWhere('f.postSlug = :post', { post: q.post });
    if (q.withMessage) qb.andWhere("f.message <> ''");
    if (q.q) {
      const like = `%${q.q.toLowerCase()}%`;
      qb.andWhere(new Brackets((w) => w.where('LOWER(f.message) LIKE :like', { like }).orWhere('LOWER(f.email) LIKE :like', { like }).orWhere('LOWER(f.name) LIKE :like', { like })));
    }
    const [rows, total] = await qb.orderBy('f.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { data: await this.views(rows), total, page, pageSize };
  }

  async get(id: number): Promise<FeedbackDto> {
    const f = await this.rows.findOneBy({ id });
    if (!f) throw new NotFoundException();
    if (f.status === 'new') {
      f.status = 'read';
      await this.rows.update(id, { status: 'read' });
    }
    return (await this.views([f]))[0]!;
  }

  async setStatus(id: number, status: FeedbackStatus) {
    const r = await this.rows.update(id, { status });
    if (!r.affected) throw new NotFoundException();
    return this.get(id);
  }

  async reply(id: number, message: string, by: string) {
    const f = await this.rows.findOneBy({ id });
    if (!f) throw new NotFoundException();
    if (!f.email) throw new BadRequestException('This reader left no e-mail address.');
    const s = await this.settings.get();
    const post = f.postSlug ? await this.feed.post(f.postSlug) : null;
    // Staff are waiting on this one, so the send is awaited and a failure is reported back.
    const ok = await this.attempt(`reply to feedback ${id}`, () => this.mail.feedbackReply(f, post, message, s));
    if (!ok) throw new BadRequestException('The reply could not be sent. Check the SMTP settings and the API log.');
    await this.rows.update(id, { reply: message, repliedAt: Date.now(), repliedBy: by, status: f.status === 'new' ? 'read' : f.status });
    return this.get(id);
  }

  async remove(id: number) {
    const r = await this.rows.delete(id);
    if (!r.affected) throw new NotFoundException();
  }

  async counts(): Promise<FeedbackCountsDto> {
    const raw = await this.rows
      .createQueryBuilder('f')
      .select('COUNT(*)', 'total')
      .addSelect("SUM(CASE WHEN f.status = 'new' THEN 1 ELSE 0 END)", 'new')
      .addSelect('SUM(CASE WHEN f.helpful = :t THEN 1 ELSE 0 END)', 'helpful')
      .addSelect('SUM(CASE WHEN f.helpful = :f THEN 1 ELSE 0 END)', 'notHelpful')
      .where("f.status <> 'spam'")
      .setParameters({ t: true, f: false })
      .getRawOne<Record<string, string | null>>();
    return { total: Number(raw?.total ?? 0), new: Number(raw?.new ?? 0), helpful: Number(raw?.helpful ?? 0), notHelpful: Number(raw?.notHelpful ?? 0) };
  }

  /** Helpful / not-helpful votes and message counts per post slug. */
  async perPost() {
    const raw = await this.rows
      .createQueryBuilder('f')
      .select('f.postSlug', 'slug')
      .addSelect('SUM(CASE WHEN f.helpful = :t THEN 1 ELSE 0 END)', 'helpful')
      .addSelect('SUM(CASE WHEN f.helpful = :f THEN 1 ELSE 0 END)', 'notHelpful')
      .addSelect("SUM(CASE WHEN f.message <> '' THEN 1 ELSE 0 END)", 'messages')
      .where('f.postSlug IS NOT NULL')
      .andWhere("f.status <> 'spam'")
      .groupBy('f.postSlug')
      .setParameters({ t: true, f: false })
      .getRawMany<{ slug: string; helpful: string; notHelpful: string; messages: string }>();
    return new Map(raw.map((r) => [r.slug, { helpful: Number(r.helpful), notHelpful: Number(r.notHelpful), messages: Number(r.messages) }]));
  }
}
