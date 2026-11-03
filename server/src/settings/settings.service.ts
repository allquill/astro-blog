import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AppConfig } from '../config/app-config.service';
import { BlogSetting } from './blog-setting.entity';
import { SettingsDto } from './settings.dto';

/** Defaults used until an admin saves Settings; NOTIFY_TO in the environment seeds the notify list. */
@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(BlogSetting) private readonly rows: Repository<BlogSetting>,
    private readonly config: AppConfig,
  ) {}

  private defaults(): SettingsDto {
    return {
      blogName: this.config.get('BLOG_NAME'),
      notifyTo: this.config.get('NOTIFY_TO'),
      notifyOnFeedback: true,
      notifyOnSubscribe: false,
      acknowledgeFeedback: true,
      sendWelcome: true,
      signature: `— The ${this.config.get('BLOG_NAME')} team`,
      digestFooter: '',
    };
  }

  async get(): Promise<SettingsDto> {
    // Only this service's keys: the same table also holds the site's settings (content/site-content.service.ts).
    const defaults = this.defaults();
    const saved = Object.fromEntries(
      (await this.rows.find()).filter((r) => r.key in defaults).map((r) => [r.key, JSON.parse(r.value) as unknown]),
    );
    return { ...defaults, ...saved } as SettingsDto;
  }

  async update(patch: Partial<SettingsDto>): Promise<SettingsDto> {
    const allowed = Object.keys(this.defaults()) as (keyof SettingsDto)[];
    for (const key of allowed) {
      if (patch[key] !== undefined) await this.rows.save({ key, value: JSON.stringify(patch[key]) });
    }
    return this.get();
  }
}
