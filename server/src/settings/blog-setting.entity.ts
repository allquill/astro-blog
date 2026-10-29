import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Runtime settings edited in the admin app (key → JSON value). See SettingsService for the keys. */
@Entity('blog_settings')
export class BlogSetting {
  @PrimaryColumn({ type: 'varchar', length: 60 })
  key: string;

  @Column({ type: 'text' })
  value: string;
}
