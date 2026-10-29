import { BadRequestException, Injectable, Logger, NotFoundException, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { setTimeout as sleep } from 'node:timers/promises';
import type { Repository } from 'typeorm';
import { AppConfig } from '../config/app-config.service';
import { type FeedPost, SiteFeedService } from '../feed/site-feed.service';
import { MailService } from '../mail/mail.service';
import { SettingsService } from '../settings/settings.service';
import { Subscriber, topicList } from '../subscribers/subscriber.entity';
import { SubscribersService } from '../subscribers/subscribers.service';
import type { CreateDigestDto, DeliveryPageDto, DigestDto, DigestPreviewDto, UpdateDigestDto } from './digest.dto';
import { Digest, DigestDelivery } from './digest.entities';

/**
 * New-post e-mails. Sending is a background loop over `digest_deliveries`: the admin's request only
 * creates the rows and returns; a restart resumes any digest left in `sending`.
 */
@Injectable()
export class DigestsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('Digests');
  private readonly running = new Set<number>();
  private stopping = false;

  constructor(
    @InjectRepository(Digest) private readonly digests: Repository<Digest>,
    @InjectRepository(DigestDelivery) private readonly deliveries: Repository<DigestDelivery>,
    @InjectRepository(Subscriber) private readonly subscribers: Repository<Subscriber>,
    private readonly subs: SubscribersService,
    private readonly feed: SiteFeedService,
    private readonly mail: MailService,
    private readonly settings: SettingsService,
    private readonly config: AppConfig,
  ) {}

  async onApplicationBootstrap() {
    for (const d of await this.digests.findBy({ status: 'sending' })) {
      this.logger.log(`Resuming digest ${d.id}`);
      void this.run(d.id);
    }
  }

  onApplicationShutdown() {
    this.stopping = true;
  }

  private async view(d: Digest): Promise<DigestDto> {
    const { postSnapshot, ...rest } = d;
    const post = postSnapshot ? (JSON.parse(postSnapshot) as FeedPost) : await this.feed.post(d.postSlug);
    return { ...rest, postSnapshot: '', post };
  }

  private async find(id: number) {
    const d = await this.digests.findOneBy({ id });
    if (!d) throw new NotFoundException();
    return d;
  }

  private async postFor(d: Digest) {
    if (d.postSnapshot) return JSON.parse(d.postSnapshot) as FeedPost;
    const p = await this.feed.post(d.postSlug);
    if (!p) throw new BadRequestException('That post is not on the site (yet). Publish it and rebuild the site first.');
    return p;
  }

  async list(): Promise<DigestDto[]> {
    const rows = await this.digests.find({ order: { createdAt: 'DESC' }, take: 200 });
    return Promise.all(rows.map((d) => this.view(d)));
  }

  async get(id: number) {
    return this.view(await this.find(id));
  }

  async create(dto: CreateDigestDto, by: string) {
    const post = await this.feed.post(dto.postSlug);
    if (!post) throw new BadRequestException({ message: 'Unknown post', errors: { postSlug: 'That post is not on the site (yet).' } });
    const d = await this.digests.save(
      this.digests.create({ postSlug: post.slug, subject: dto.subject?.trim() || `New post: ${post.title}`, intro: dto.intro ?? '', createdBy: by }),
    );
    return this.view(d);
  }

  async update(id: number, dto: UpdateDigestDto) {
    const d = await this.find(id);
    if (d.status !== 'draft') throw new BadRequestException('Only a draft can be changed.');
    await this.digests.update(id, { ...(dto.subject !== undefined && { subject: dto.subject.trim() }), ...(dto.intro !== undefined && { intro: dto.intro }) });
    return this.get(id);
  }

  async remove(id: number) {
    const d = await this.find(id);
    if (d.status === 'sending') throw new BadRequestException('Wait until this digest has finished sending.');
    await this.digests.delete(id);
  }

  /** Active subscribers who want this post: "all topics" ([]), or at least one of the post's topics. */
  private async audienceFor(post: FeedPost) {
    const active = await this.subscribers.find({ where: { status: 'active' }, select: { id: true, email: true, topics: true } });
    return active.filter((s) => {
      const t = topicList(s);
      return !t.length || !post.topics.length || t.some((x) => post.topics.includes(x));
    });
  }

  async audience(postSlug: string) {
    const post = await this.feed.post(postSlug);
    return { audience: post ? (await this.audienceFor(post)).length : 0 };
  }

  async preview(id: number): Promise<DigestPreviewDto> {
    const d = await this.find(id);
    const post = await this.postFor(d);
    const { html, text } = this.mail.renderDigest(d, post, 'PREVIEW', await this.settings.get());
    return { subject: d.subject, html, text, audience: (await this.audienceFor(post)).length };
  }

  /** One copy to a staff address, with a dummy unsubscribe link. Awaited: staff want to know it worked. */
  async test(id: number, to: string) {
    const d = await this.find(id);
    const post = await this.postFor(d);
    try {
      await this.mail.sendDigest({ email: to, name: '' }, d, post, null, await this.settings.get());
    } catch (e) {
      throw new BadRequestException(`The test e-mail could not be sent: ${(e as Error).message}`);
    }
  }

  async send(id: number) {
    const d = await this.find(id);
    if (d.status !== 'draft') throw new BadRequestException('This digest has already been sent.');
    const post = await this.postFor(d);
    const audience = await this.audienceFor(post);
    if (!audience.length) throw new BadRequestException('No active subscriber follows this post\'s topics.');
    // Claim the draft first, so a double click can't queue it twice.
    const claimed = await this.digests.update({ id, status: 'draft' }, { status: 'sending', postSnapshot: JSON.stringify(post), recipients: audience.length, startedAt: Date.now() });
    if (!claimed.affected) throw new BadRequestException('This digest has already been sent.');
    for (let i = 0; i < audience.length; i += 200) {
      await this.deliveries
        .createQueryBuilder()
        .insert()
        .values(audience.slice(i, i + 200).map((s) => ({ digestId: id, subscriberId: s.id, email: s.email })))
        .orIgnore()
        .execute();
    }
    void this.run(id);
    return this.get(id);
  }

  /** Works through the pending deliveries in batches. Safe to call again for the same digest. */
  private async run(id: number) {
    if (this.running.has(id)) return;
    this.running.add(id);
    const size = this.config.get('DIGEST_BATCH_SIZE');
    const pause = this.config.get('DIGEST_BATCH_PAUSE_MS');
    try {
      const d = await this.find(id);
      const post = JSON.parse(d.postSnapshot) as FeedPost;
      const settings = await this.settings.get();
      for (;;) {
        if (this.stopping) return;
        const batch = await this.deliveries.find({ where: { digestId: id, status: 'pending' }, take: size, order: { id: 'ASC' } });
        if (!batch.length) break;
        for (const del of batch) {
          const sub = await this.subscribers.createQueryBuilder('s').addSelect('s.accessKey').where({ id: del.subscriberId }).getOne();
          // Unsubscribed (or deleted) since the digest was queued: skip, don't send.
          if (!sub || sub.status !== 'active') {
            await this.deliveries.update(del.id, { status: 'failed', error: 'no longer subscribed' });
            continue;
          }
          try {
            await this.mail.sendDigest(sub, d, post, this.subs.token('manage', sub), settings);
            await this.deliveries.update(del.id, { status: 'sent', sentAt: Date.now(), error: '' });
          } catch (e) {
            await this.deliveries.update(del.id, { status: 'failed', error: (e as Error).message.slice(0, 1000) });
          }
        }
        await this.tally(id);
        if (pause) await sleep(pause);
      }
      const t = await this.tally(id);
      await this.digests.update(id, { status: t.sent || !t.failed ? 'sent' : 'failed', finishedAt: Date.now() });
      this.logger.log(`Digest ${id} done: ${t.sent} sent, ${t.failed} failed`);
    } catch (e) {
      this.logger.error(`Digest ${id} stopped: ${(e as Error).message}`);
    } finally {
      this.running.delete(id);
    }
  }

  private async tally(id: number) {
    const sent = await this.deliveries.countBy({ digestId: id, status: 'sent' });
    const failed = await this.deliveries.countBy({ digestId: id, status: 'failed' });
    await this.digests.update(id, { sentCount: sent, failedCount: failed });
    return { sent, failed };
  }

  async deliveryPage(id: number, q: { status?: DigestDelivery['status']; page?: number; pageSize?: number }): Promise<DeliveryPageDto> {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 50));
    const where = { digestId: id, ...(q.status ? { status: q.status } : {}) };
    const [data, total] = await this.deliveries.findAndCount({ where, order: { id: 'ASC' }, skip: (page - 1) * pageSize, take: pageSize });
    return { data, total, page, pageSize };
  }
}
