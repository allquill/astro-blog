import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { SiteFeedService } from '../feed/site-feed.service';
import { PostLike, PostStat, type ShareNetwork } from './engagement.entities';
import type { PostCountsDto, PostStatsDto } from './engagement.dto';

@Injectable()
export class EngagementService {
  constructor(
    @InjectRepository(PostStat) private readonly stats: Repository<PostStat>,
    @InjectRepository(PostLike) private readonly likes: Repository<PostLike>,
    private readonly feed: SiteFeedService,
  ) {}

  private async known(slug: string) {
    if (!(await this.feed.isKnown(slug))) throw new NotFoundException('There is no such post.');
  }

  /** The counter row, created on first use (concurrent creators are fine: the slug is unique). */
  private async row(slug: string) {
    await this.stats.createQueryBuilder().insert().values({ slug }).orIgnore().execute();
    return this.stats.findOneByOrFail({ slug });
  }

  async counts(slugs: string[]): Promise<PostCountsDto[]> {
    if (!slugs.length) return [];
    const rows = await this.stats.findBy({ slug: In(slugs) });
    return rows.map((r) => ({ slug: r.slug, likes: r.likes, shares: r.shares }));
  }

  async forVisitor(slug: string, visitor: string): Promise<PostStatsDto> {
    const r = await this.stats.findOneBy({ slug });
    const liked = r ? await this.likes.exists({ where: { slug, visitorHash: visitor } }) : false;
    return { ok: true, slug, likes: r?.likes ?? 0, shares: r?.shares ?? 0, liked };
  }

  async setLike(slug: string, visitor: string, liked: boolean): Promise<PostStatsDto> {
    await this.known(slug);
    await this.row(slug);
    if (liked) await this.likes.createQueryBuilder().insert().values({ slug, visitorHash: visitor }).orIgnore().execute();
    else await this.likes.delete({ slug, visitorHash: visitor });
    // Recount instead of incrementing, so a double click or a lost response can never drift the total.
    await this.stats.update({ slug }, { likes: await this.likes.countBy({ slug }) });
    return this.forVisitor(slug, visitor);
  }

  async share(slug: string, network: ShareNetwork, visitor: string): Promise<PostStatsDto> {
    await this.known(slug);
    const r = await this.row(slug);
    const by = JSON.parse(r.sharesByNetwork || '{}') as Record<string, number>;
    by[network] = (by[network] ?? 0) + 1;
    await this.stats.update({ slug }, { sharesByNetwork: JSON.stringify(by) });
    await this.stats.increment({ slug }, 'shares', 1);
    return this.forVisitor(slug, visitor);
  }
}
