import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, type Repository } from 'typeorm';
import { AppConfig } from '../config/app-config.service';
import { linkToken, newAccessKey, tokenId, verifyToken, type LinkPurpose } from '../common/links';
import { DigestDelivery } from '../digests/digest.entities';
import { SiteFeedService } from '../feed/site-feed.service';
import { MailService } from '../mail/mail.service';
import { SettingsService } from '../settings/settings.service';
import type {
  ImportResultDto, ManageSubscriptionDto, SubscribeDto, SubscriberCountsDto, SubscriberDto, SubscriberPageDto, SubscriptionDto, UpdateSubscriberDto,
} from './subscriber.dto';
import { Subscriber, type SubscriberStatus, topicList } from './subscriber.entity';

/** A confirm e-mail is not re-sent to the same address more often than this. */
const RESEND_AFTER_MS = 2 * 60 * 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SUBSCRIBE_MESSAGE = 'Almost done: check your inbox and click the link to confirm your subscription.';

@Injectable()
export class SubscribersService {
  private readonly logger = new Logger('Subscribers');

  constructor(
    @InjectRepository(Subscriber) private readonly rows: Repository<Subscriber>,
    private readonly config: AppConfig,
    private readonly mail: MailService,
    private readonly settings: SettingsService,
    private readonly feed: SiteFeedService,
  ) {}

  private secret() {
    return this.config.get('JWT_SECRET_KEY');
  }

  private withKey(where: Partial<Pick<Subscriber, 'id' | 'email'>>) {
    return this.rows.createQueryBuilder('s').addSelect('s.accessKey').where(where).getOne();
  }

  token(purpose: LinkPurpose, s: Subscriber) {
    return linkToken(purpose, s.id, s.accessKey, this.secret());
  }

  /** The subscriber a link token opens, or 404 (never says whether the id exists). */
  private async byToken(token: string | undefined, purpose: LinkPurpose) {
    const id = tokenId(token);
    const s = id ? await this.withKey({ id }) : null;
    if (!s || !verifyToken(token!, purpose, s.id, s.accessKey, this.secret())) {
      throw new NotFoundException('This link is not valid any more. Please use the most recent e-mail from us, or subscribe again.');
    }
    return s;
  }

  /** Drops topic slugs the site doesn't have (keeps them all while the feed can't be read). */
  private async cleanTopics(topics: string[]) {
    const known = await this.feed.allTopics();
    if (!known.length) return [...new Set(topics)];
    const slugs = new Set(known.map((t) => t.slug));
    return [...new Set(topics.filter((t) => slugs.has(t)))];
  }

  /** Sends one e-mail and logs the outcome; never throws, so a request never fails on SMTP. */
  private async attempt(label: string, send: () => Promise<unknown>) {
    try {
      await send();
      return true;
    } catch (err) {
      this.logger.error(`${label} failed: ${(err as Error).message}`);
      return false;
    }
  }

  // ============================================================================== public

  /**
   * Double opt-in. The answer is the same whatever state the address is in, so the form can't be
   * used to find out who is subscribed; an already-active address gets its manage link instead.
   */
  async subscribe(dto: SubscribeDto, ipHash: string) {
    const topics = await this.cleanTopics(dto.topics);
    let s = await this.withKey({ email: dto.email });
    const s0 = await this.settings.get();
    if (s?.status === 'active') {
      void this.attempt(`manage link to subscriber ${s.id}`, () => this.mail.alreadySubscribed(s!, this.token('manage', s!), s0));
      return;
    }
    if (s?.confirmSentAt && Date.now() - s.confirmSentAt < RESEND_AFTER_MS) return;
    if (!s) {
      s = this.rows.create({ email: dto.email, accessKey: newAccessKey(), status: 'pending' });
    }
    Object.assign(s, {
      name: dto.name?.trim() || s.name,
      topics: JSON.stringify(topics),
      status: 'pending' satisfies SubscriberStatus,
      source: (dto.source ?? '').slice(0, 120),
      ipHash,
      confirmSentAt: Date.now(),
    });
    s = await this.rows.save(s);
    // Saved first; the e-mail goes out after the response.
    void this.attempt(`confirm e-mail to subscriber ${s.id}`, () => this.mail.confirmSubscription(s!, this.token('confirm', s!), s0));
  }

  async confirm(token: string) {
    const s = await this.byToken(token, 'confirm');
    const wasActive = s.status === 'active';
    if (!wasActive) {
      await this.rows.update(s.id, { status: 'active', confirmedAt: Date.now(), unsubscribedAt: null });
      const st = await this.settings.get();
      const fresh = { ...s, status: 'active' as const };
      if (st.sendWelcome) void this.attempt(`welcome to subscriber ${s.id}`, () => this.mail.welcome(fresh, this.token('manage', s), st));
      if (st.notifyOnSubscribe && st.notifyTo.length) void this.attempt('new-subscriber notice', () => this.mail.newSubscriber(fresh, st.notifyTo, st));
    }
    return { ok: true, manageToken: this.token('manage', s) };
  }

  async subscription(token: string): Promise<SubscriptionDto> {
    const s = await this.byToken(token, 'manage');
    const allTopics = (await this.feed.allTopics()).map((t) => ({ slug: t.slug, name: t.name }));
    return { ok: true, email: s.email, name: s.name, status: s.status, topics: topicList(s), allTopics };
  }

  async manage(dto: ManageSubscriptionDto) {
    const s = await this.byToken(dto.token, 'manage');
    if (dto.action === 'unsubscribe') return this.unsubscribe(s);
    const patch: Partial<Subscriber> = { topics: JSON.stringify(await this.cleanTopics(dto.topics)) };
    if (dto.name !== undefined) patch.name = dto.name.trim();
    // Re-subscribing from a link they already hold needs no second confirmation.
    if (dto.action === 'resubscribe' || s.status === 'active') Object.assign(patch, { status: 'active', unsubscribedAt: null });
    await this.rows.update(s.id, patch);
    return this.subscription(dto.token);
  }

  /** RFC 8058 one-click unsubscribe (List-Unsubscribe-Post) and the manage page's button. */
  async unsubscribeByToken(token: string) {
    return this.unsubscribe(await this.byToken(token, 'manage'));
  }

  private async unsubscribe(s: Subscriber) {
    if (s.status !== 'unsubscribed') await this.rows.update(s.id, { status: 'unsubscribed', unsubscribedAt: Date.now() });
    const out = await this.withKey({ id: s.id });
    return this.subscription(this.token('manage', out!));
  }

  // =============================================================================== admin

  view(s: Subscriber): SubscriberDto {
    return {
      id: s.id, email: s.email, name: s.name, status: s.status, topics: topicList(s), source: s.source,
      confirmedAt: s.confirmedAt, unsubscribedAt: s.unsubscribedAt, createdAt: s.createdAt,
    };
  }

  private filtered(q: { q?: string; status?: string; topic?: string }) {
    const qb = this.rows.createQueryBuilder('s');
    if (q.status) qb.andWhere('s.status = :status', { status: q.status });
    if (q.q) {
      const like = `%${q.q.toLowerCase()}%`;
      qb.andWhere(new Brackets((w) => w.where('LOWER(s.email) LIKE :like', { like }).orWhere('LOWER(s.name) LIKE :like', { like })));
    }
    // topics is a JSON array of slugs; "all topics" ([]) matches every topic filter too.
    if (q.topic) qb.andWhere(new Brackets((w) => w.where("s.topics = '[]'").orWhere('s.topics LIKE :t', { t: `%"${q.topic}"%` })));
    return qb;
  }

  async list(q: { q?: string; status?: string; topic?: string; page?: number; pageSize?: number }): Promise<SubscriberPageDto> {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 50));
    const [rows, total] = await this.filtered(q).orderBy('s.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { data: rows.map((s) => this.view(s)), total, page, pageSize };
  }

  async csv(q: { q?: string; status?: string; topic?: string }) {
    const rows = await this.filtered(q).orderBy('s.createdAt', 'ASC').getMany();
    // Leading = + - @ would be run as a formula by spreadsheets; prefix them.
    const cell = (v: unknown) => {
      let s = v === null || v === undefined ? '' : String(v);
      if (/^[=+\-@]/.test(s)) s = `'${s}`;
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const iso = (ms: number | null) => (ms ? new Date(ms).toISOString() : '');
    const lines = [['email', 'name', 'status', 'topics', 'source', 'created', 'confirmed', 'unsubscribed'].join(',')];
    for (const s of rows) {
      lines.push([s.email, s.name, s.status, topicList(s).join(';'), s.source, s.createdAt.toISOString(), iso(s.confirmedAt), iso(s.unsubscribedAt)].map(cell).join(','));
    }
    return lines.join('\n') + '\n';
  }

  async counts(): Promise<SubscriberCountsDto> {
    const rows = await this.rows.createQueryBuilder('s').select('s.status', 'status').addSelect('COUNT(*)', 'n').groupBy('s.status').getRawMany<{ status: SubscriberStatus; n: string }>();
    const out: SubscriberCountsDto = { pending: 0, active: 0, unsubscribed: 0, bounced: 0 };
    for (const r of rows) out[r.status] = Number(r.n);
    return out;
  }

  async update(id: number, dto: UpdateSubscriberDto) {
    const s = await this.rows.findOneBy({ id });
    if (!s) throw new NotFoundException();
    const patch: Partial<Subscriber> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.topics) patch.topics = JSON.stringify(await this.cleanTopics(dto.topics));
    if (dto.status && dto.status !== s.status) {
      patch.status = dto.status;
      if (dto.status === 'active') Object.assign(patch, { confirmedAt: s.confirmedAt ?? Date.now(), unsubscribedAt: null });
      if (dto.status === 'unsubscribed') patch.unsubscribedAt = Date.now();
    }
    await this.rows.update(id, patch);
    return this.view((await this.rows.findOneBy({ id }))!);
  }

  /** Removes the subscriber and the copies of their address in past digests' delivery records. */
  async remove(id: number) {
    const r = await this.rows.delete(id);
    if (!r.affected) throw new NotFoundException();
    await this.rows.manager.getRepository(DigestDelivery).delete({ subscriberId: id });
  }

  async resendConfirm(id: number) {
    const s = await this.withKey({ id });
    if (!s) throw new NotFoundException();
    if (s.status !== 'pending') throw new BadRequestException('Only pending subscribers are sent a confirm e-mail.');
    await this.rows.update(id, { confirmSentAt: Date.now() });
    const ok = await this.attempt(`confirm e-mail to subscriber ${id}`, async () => this.mail.confirmSubscription(s, this.token('confirm', s), await this.settings.get()));
    if (!ok) throw new BadRequestException('The e-mail could not be sent. Check the SMTP settings and the API log.');
  }

  /** Very small CSV reader: header row, comma-separated, double-quoted fields. */
  private parseCsv(text: string) {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i]!;
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') row.push(cell), (cell = '');
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell), rows.push(row), (row = []), (cell = '');
      } else cell += c;
    }
    if (cell || row.length) row.push(cell), rows.push(row);
    return rows.filter((r) => r.some((c) => c.trim()));
  }

  async import(csv: string, consented: boolean): Promise<ImportResultDto> {
    const [header, ...rows] = this.parseCsv(csv);
    const cols = (header ?? []).map((h) => h.trim().toLowerCase());
    const at = (name: string) => cols.indexOf(name);
    if (at('email') < 0) throw new BadRequestException({ message: 'The CSV needs an "email" column.', errors: { csv: 'The CSV needs an "email" column.' } });
    const out: ImportResultDto = { added: 0, skipped: 0, invalid: [] };
    const st = await this.settings.get();
    for (const r of rows) {
      const email = (r[at('email')] ?? '').trim().toLowerCase();
      if (!EMAIL.test(email) || email.length > 254) {
        if (out.invalid.length < 50) out.invalid.push(email || '(empty)');
        continue;
      }
      if (await this.rows.existsBy({ email })) {
        out.skipped++;
        continue;
      }
      const topics = at('topics') >= 0 ? (r[at('topics')] ?? '').split(';').map((t) => t.trim()).filter(Boolean) : [];
      const s = await this.rows.save(
        this.rows.create({
          email,
          name: (at('name') >= 0 ? (r[at('name')] ?? '') : '').trim().slice(0, 120),
          topics: JSON.stringify(await this.cleanTopics(topics)),
          accessKey: newAccessKey(),
          source: 'import',
          status: consented ? 'active' : 'pending',
          confirmedAt: consented ? Date.now() : null,
          confirmSentAt: consented ? null : Date.now(),
        }),
      );
      out.added++;
      if (!consented) void this.attempt(`confirm e-mail to subscriber ${s.id}`, () => this.mail.confirmSubscription(s, this.token('confirm', s), st));
    }
    return out;
  }
}
