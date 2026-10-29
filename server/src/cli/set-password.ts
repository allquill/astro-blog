// Create an admin user, or reset a user's password (and re-enable the account), directly in the
// configured database. For lock-outs — normally users are added from the admin app (Users):
//
//   pnpm --dir server run admin:set-password <username>            (prompts, input hidden)
//   docker compose exec api node dist/cli/set-password.js <username>    (inside the container)
//
// Reads the same settings as the API (server/.env, then the environment). Changing a password logs
// that user's existing sessions out.
import '../common/utc';
import 'reflect-metadata';
import { createInterface } from 'node:readline';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { AdminUsersService, MIN_PASSWORD_LENGTH } from '../auth/admin-users.service';
import { AdminUser } from '../auth/admin-user.entity';
import { validate } from '../config/env.validation';
import { typeOrmOptions } from '../database/database.module';

async function promptHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
  out._writeToOutput = (s: string) => {
    if (s.startsWith(question)) out.output.write(s);
  };
  const answer = await new Promise<string>((resolve) => rl.question(question, resolve));
  rl.close();
  process.stdout.write('\n');
  return answer;
}

async function main() {
  const username = (process.argv[2] ?? '').trim();
  if (!username) {
    console.error('Usage: pnpm --dir server run admin:set-password <username>');
    process.exit(1);
  }
  try {
    process.loadEnvFile('.env');
  } catch {
    // no server/.env — rely on the environment
  }
  const env = validate(process.env);

  const password = process.env.NEW_ADMIN_PASSWORD ?? (await promptHidden(`New password for "${username}": `));
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }
  if (!process.env.NEW_ADMIN_PASSWORD && (await promptHidden('Repeat it: ')) !== password) {
    console.error("The passwords don't match.");
    process.exit(1);
  }

  const ds = new DataSource(typeOrmOptions(env) as DataSourceOptions);
  await ds.initialize();
  await ds.runMigrations();
  const { created } = await new AdminUsersService(ds.getRepository(AdminUser)).ensureAdmin(username, password);
  await ds.destroy();
  console.log(
    created
      ? `Created admin user "${username}".`
      : `Password updated for "${username}" (account re-enabled if it was disabled); their other sessions are logged out.`,
  );
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
