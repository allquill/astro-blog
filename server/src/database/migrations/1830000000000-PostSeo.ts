import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Per-post search-engine settings: an SEO title and meta description that override the title and
 * excerpt in <title> and share cards, and `noindex` to keep a post out of search engines and the sitemap.
 */
export class PostSeo1830000000000 implements MigrationInterface {
  name = 'PostSeo1830000000000';

  async up(q: QueryRunner): Promise<void> {
    const pg = q.connection.options.type === 'postgres';
    await q.addColumns('posts', [
      new TableColumn({ name: 'seo_title', type: 'varchar', length: '120', isNullable: false, default: "''" }),
      new TableColumn({ name: 'seo_description', type: 'varchar', length: '300', isNullable: false, default: "''" }),
      new TableColumn({ name: 'noindex', type: 'boolean', isNullable: false, default: pg ? false : 0 }),
    ]);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.dropColumn('posts', 'noindex');
    await q.dropColumn('posts', 'seo_description');
    await q.dropColumn('posts', 'seo_title');
  }
}
