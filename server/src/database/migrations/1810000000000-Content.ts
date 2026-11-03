import { MigrationInterface, QueryRunner, Table, type TableColumnOptions } from 'typeorm';

/**
 * Blog content in the database (posts, topics, authors, pages, media), replacing the website's
 * Keystatic files. Table API only, so it runs on SQLite and Postgres; columns match
 * content/content.entities.ts exactly. JSON lists are `text` holding JSON on both drivers.
 */
export class Content1810000000000 implements MigrationInterface {
  name = 'Content1810000000000';

  async up(q: QueryRunner): Promise<void> {
    const pg = q.connection.options.type === 'postgres';
    const ts = pg ? 'timestamp' : 'datetime';
    const now = pg ? 'now()' : "datetime('now')";

    const id: TableColumnOptions = { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' };
    const created: TableColumnOptions = { name: 'created_at', type: ts, default: now, isNullable: false };
    const updated: TableColumnOptions = { name: 'updated_at', type: ts, default: now, isNullable: false };
    const str = (name: string, length: number, opts: Partial<TableColumnOptions> = {}): TableColumnOptions => ({
      name, type: 'varchar', length: String(length), isNullable: false, default: "''", ...opts,
    });
    const text = (name: string, def = "''"): TableColumnOptions => ({ name, type: 'text', isNullable: false, default: def });
    const int = (name: string, def: number): TableColumnOptions => ({ name, type: 'integer', isNullable: false, default: def });
    const bigint = (name: string): TableColumnOptions => ({ name, type: 'bigint', isNullable: true });
    const bool = (name: string, def: boolean): TableColumnOptions => ({
      name, type: 'boolean', isNullable: false, default: pg ? def : def ? 1 : 0,
    });
    const slug: TableColumnOptions = { name: 'slug', type: 'varchar', length: '120', isNullable: false, isUnique: true };

    await q.createTable(
      new Table({
        name: 'posts',
        columns: [
          id,
          slug,
          { name: 'title', type: 'varchar', length: '200', isNullable: false },
          text('excerpt'),
          text('body'),
          str('status', 10, { default: "'draft'" }),
          bigint('published_date'),
          bigint('updated_date'),
          bigint('first_published_at'),
          str('author_slug', 120),
          text('topics', "'[]'"),
          text('tags', "'[]'"),
          { name: 'cover_id', type: 'varchar', length: '36', isNullable: true },
          str('cover_alt', 300),
          str('series', 120),
          bool('featured', false),
          str('canonical_url', 500),
          str('updated_by', 120),
          created,
          updated,
        ],
        indices: [{ name: 'posts_status_published', columnNames: ['status', 'published_date'] }],
      }),
      true,
    );

    await q.createTable(
      new Table({
        name: 'topics',
        columns: [
          id,
          slug,
          { name: 'name', type: 'varchar', length: '120', isNullable: false },
          text('description'),
          str('icon', 30, { default: "'book'" }),
          str('accent', 20, { default: "'teal'" }),
          int('sort_order', 10),
          created,
          updated,
        ],
      }),
      true,
    );

    await q.createTable(
      new Table({
        name: 'authors',
        columns: [
          id,
          slug,
          { name: 'name', type: 'varchar', length: '120', isNullable: false },
          str('role', 120),
          text('bio'),
          { name: 'avatar_id', type: 'varchar', length: '36', isNullable: true },
          text('links', "'[]'"),
          created,
          updated,
        ],
      }),
      true,
    );

    await q.createTable(
      new Table({
        name: 'pages',
        columns: [
          id,
          slug,
          { name: 'title', type: 'varchar', length: '200', isNullable: false },
          text('description'),
          text('body'),
          bigint('updated_date'),
          bool('show_in_header', false),
          bool('show_in_footer', true),
          created,
          updated,
        ],
      }),
      true,
    );

    await q.createTable(
      new Table({
        name: 'media',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'file_name', type: 'varchar', length: '200', isNullable: false },
          { name: 'mime', type: 'varchar', length: '40', isNullable: false },
          int('width', 0),
          int('height', 0),
          int('bytes', 0),
          str('alt', 300),
          str('created_by', 120),
          created,
        ],
      }),
      true,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    for (const t of ['media', 'pages', 'authors', 'topics', 'posts']) await q.dropTable(t, true);
  }
}
