import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AppConfig } from '../config/app-config.service';
import { BlogSetting } from '../settings/blog-setting.entity';
import { DEFAULT_SHARE } from './content.constants';
import type { HomeDto, SiteSettingsDto } from './content.dto';

const SITE_KEY = 'site';
const HOME_KEY = 'home';

/**
 * The site's own settings (name, navigation, share buttons, …) and the home page's texts: one JSON
 * value each in `blog_settings`, under the keys `site` and `home`, merged over these defaults.
 */
@Injectable()
export class SiteContentService {
  constructor(
    @InjectRepository(BlogSetting) private readonly rows: Repository<BlogSetting>,
    private readonly config: AppConfig,
  ) {}

  private siteDefaults(): SiteSettingsDto {
    return {
      siteName: this.config.get('BLOG_NAME'),
      tagline: '',
      description: '',
      publisher: '',
      email: '',
      social: [],
      nav: [],
      footerLinks: [],
      shareNetworks: [...DEFAULT_SHARE],
      subscribeTitle: 'Get new posts by e-mail',
      subscribeText: '',
      postsPerPage: 12,
      indexNowKey: '',
    };
  }

  private homeDefaults(): HomeDto {
    return { eyebrow: '', heroTitle: this.config.get('BLOG_NAME'), heroSubtitle: '', latestTitle: 'Latest posts', topicsTitle: 'Browse by topic' };
  }

  private async read<T extends object>(key: string, defaults: T): Promise<T> {
    const row = await this.rows.findOneBy({ key });
    if (!row) return defaults;
    try {
      const saved = JSON.parse(row.value) as Partial<T>;
      return { ...defaults, ...Object.fromEntries(Object.entries(saved).filter(([k]) => k in defaults)) };
    } catch {
      return defaults;
    }
  }

  /** Whether the site settings / home texts have been saved at all (an import fills them in when not). */
  async saved(which: 'site' | 'home') {
    return this.rows.existsBy({ key: which === 'site' ? SITE_KEY : HOME_KEY });
  }

  site() {
    return this.read(SITE_KEY, this.siteDefaults());
  }

  home() {
    return this.read(HOME_KEY, this.homeDefaults());
  }

  async saveSite(value: SiteSettingsDto) {
    await this.rows.save({ key: SITE_KEY, value: JSON.stringify(value) });
    return this.site();
  }

  async saveHome(value: HomeDto) {
    await this.rows.save({ key: HOME_KEY, value: JSON.stringify(value) });
    return this.home();
  }
}
