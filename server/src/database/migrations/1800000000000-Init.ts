import { MigrationInterface, QueryRunner, Table, type TableColumnOptions, type TableForeignKeyOptions } from 'typeorm';

/**
 * Initial schema. Written with the Table API so it runs on both SQLite and Postgres; column names and
 * types match the entities exactly (synchronize is off, so this file IS the schema).
 */
export class Init1800000000000 implements MigrationInterface {
  name = 'Init1800000000000';

  async up(q: QueryRunner): Promise<void> {
    const pg = q.connection.options.type === 'postgres';
    // Match what TypeORM's Create/UpdateDateColumn expect on each driver, so entities and schema never drift.
    const ts = pg ? 'timestamp' : 'datetime';
    const now = pg ? 'now()' : "datetime('now')";

    const id: TableColumnOptions = { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' };
    const created: TableColumnOptions = { name: 'created_at', type: ts, default: now, isNullable: false };
    const updated: TableColumnOptions = { name: 'updated_at', type: ts, default: now, isNullable: false };
    const str = (name: string, length: number, opts: Partial<TableColumnOptions> = {}): TableColumnOptions => ({
      name, type: 'varchar', length: String(length), isNullable: false, default: "''", ...opts,
    });
    const text = (name: string, def: string | null = "''"): TableColumnOptions => ({
      name, type: 'text', isNullable: false, ...(def === null ? {} : { default: def }),
    });
    const int = (name: string, def: number | null = 0): TableColumnOptions =>
      def === null ? { name, type: 'integer', isNullable: true } : { name, type: 'integer', isNullable: false, default: def };
    /** Required foreign key column. */
    const ref = (name: string): TableColumnOptions => ({ name, type: 'integer', isNullable: false });
    const bigint = (name: string): TableColumnOptions => ({ name, type: 'bigint', isNullable: true });
    // Written the way TypeORM renders the entity default on each driver (SQLite stores booleans as 0/1).
    const bool = (name: string, def: boolean): TableColumnOptions => ({
      name, type: 'boolean', isNullable: false, default: pg ? def : def ? 1 : 0,
    });
    const fk = (column: string, table: string, onDelete: 'CASCADE' | 'SET NULL'): TableForeignKeyOptions => ({
      columnNames: [column], referencedTableName: table, referencedColumnNames: ['id'], onDelete,
    });

    // ------------------------------------------------------------------------ admin users
    await q.createTable(
      new Table({
        name: 'admin_users',
        columns: [
          id,
          { name: 'username', type: 'varchar', length: '120', isNullable: false, isUnique: true },
          { name: 'email', type: 'varchar', length: '254', isNullable: true, isUnique: true },
          str('role', 10, { default: "'admin'" }),
          bool('disabled', false),
          { name: 'password_hash', type: 'varchar', length: '100', isNullable: true },
          { name: 'password_changed_at', type: 'bigint', isNullable: false },
          { name: 'invite_token_hash', type: 'varchar', length: '64', isNullable: true },
          bigint('invite_expires_at'),
          bigint('last_login_at'),
          created,
          updated,
        ],
      }),
      true,
    );

    await q.createTable(
      new Table({
        name: 'blog_settings',
        columns: [{ name: 'key', type: 'varchar', length: '60', isPrimary: true }, text('value', null)],
      }),
      true,
    );

    // -------------------------------------------------------------------------- engagement
    await q.createTable(
      new Table({
        name: 'post_stats',
        columns: [
          id,
          { name: 'slug', type: 'varchar', length: '120', isNullable: false, isUnique: true },
          int('likes'),
          int('shares'),
          text('shares_by_network', "'{}'"),
          updated,
        ],
      }),
      true,
    );
    await q.createTable(
      new Table({
        name: 'post_likes',
        columns: [id, str('slug', 120), str('visitor_hash', 32), created],
        indices: [{ name: 'post_likes_slug_visitor', columnNames: ['slug', 'visitor_hash'], isUnique: true }],
      }),
      true,
    );

    // ------------------------------------------------------------------------- subscribers
    await q.createTable(
      new Table({
        name: 'subscribers',
        columns: [
          id,
          { name: 'email', type: 'varchar', length: '254', isNullable: false, isUnique: true },
          str('name', 120),
          str('status', 16, { default: "'pending'" }),
          text('topics', "'[]'"),
          { name: 'access_key', type: 'varchar', length: '64', isNullable: false },
          str('source', 120),
          str('ip_hash', 16),
          bigint('confirm_sent_at'),
          bigint('confirmed_at'),
          bigint('unsubscribed_at'),
          created,
          updated,
        ],
        indices: [{ name: 'subscribers_status', columnNames: ['status'] }],
      }),
      true,
    );

    // ---------------------------------------------------------------------------- feedback
    await q.createTable(
      new Table({
        name: 'feedback',
        columns: [
          id,
          str('kind', 10, { default: "'general'" }),
          { name: 'post_slug', type: 'varchar', length: '120', isNullable: true },
          { name: 'helpful', type: 'boolean', isNullable: true },
          str('name', 120),
          str('email', 254),
          text('message'),
          str('status', 10, { default: "'new'" }),
          text('reply'),
          bigint('replied_at'),
          str('replied_by', 120),
          str('ip_hash', 16),
          created,
          updated,
        ],
        indices: [
          { name: 'feedback_status_created', columnNames: ['status', 'created_at'] },
          { name: 'feedback_post_slug', columnNames: ['post_slug'] },
        ],
      }),
      true,
    );

    // ----------------------------------------------------------------------------- digests
    await q.createTable(
      new Table({
        name: 'digests',
        columns: [
          id,
          str('post_slug', 120),
          str('subject', 200),
          text('intro'),
          text('post_snapshot'),
          str('status', 10, { default: "'draft'" }),
          int('recipients'),
          int('sent_count'),
          int('failed_count'),
          str('created_by', 120),
          bigint('started_at'),
          bigint('finished_at'),
          created,
          updated,
        ],
      }),
      true,
    );
    await q.createTable(
      new Table({
        name: 'digest_deliveries',
        columns: [id, ref('digest_id'), ref('subscriber_id'), str('email', 254), str('status', 10, { default: "'pending'" }), text('error'), bigint('sent_at')],
        foreignKeys: [fk('digest_id', 'digests', 'CASCADE')],
        indices: [
          { name: 'digest_deliveries_digest_subscriber', columnNames: ['digest_id', 'subscriber_id'], isUnique: true },
          { name: 'digest_deliveries_digest_status', columnNames: ['digest_id', 'status'] },
        ],
      }),
      true,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    for (const t of ['digest_deliveries', 'digests', 'feedback', 'subscribers', 'post_likes', 'post_stats', 'blog_settings', 'admin_users']) {
      await q.dropTable(t, true);
    }
  }
}
