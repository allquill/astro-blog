import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** posts.repository_url: an optional https link to the code behind a post, shown in its header. */
export class PostRepository1820000000000 implements MigrationInterface {
  name = 'PostRepository1820000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.addColumn('posts', new TableColumn({ name: 'repository_url', type: 'varchar', length: '500', isNullable: false, default: "''" }));
  }

  async down(q: QueryRunner): Promise<void> {
    await q.dropColumn('posts', 'repository_url');
  }
}
