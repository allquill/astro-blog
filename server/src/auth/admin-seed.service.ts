import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AppConfig } from '../config/app-config.service';
import { AdminUsersService } from './admin-users.service';

/**
 * Creates the first admin from ADMIN_USERNAME / ADMIN_PASSWORD when the database has none — the
 * same idea as ef-backend's seeded users. After that the password lives only as a bcrypt hash in
 * the database and ADMIN_PASSWORD can be removed from your .env (server/.env, or docker/.env in Docker).
 */
@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Admin');

  constructor(
    private readonly users: AdminUsersService,
    private readonly config: AppConfig,
  ) {}

  async onApplicationBootstrap() {
    for (const legacy of ['ADMIN_PASSWORD_HASH', 'SESSION_SECRET']) {
      if (process.env[legacy]) this.logger.warn(`${legacy} is no longer used and can be removed from .env (server/.env, or docker/.env in Docker)`);
    }

    const password = this.config.get('ADMIN_PASSWORD');
    const username = this.config.get('ADMIN_USERNAME');
    if ((await this.users.count()) > 0) {
      if (password) this.logger.warn('ADMIN_PASSWORD is ignored because an admin already exists; you can remove it from .env (server/.env, or docker/.env in Docker)');
      return;
    }
    if (!password) {
      this.logger.warn(
        'No admin user exists yet, so nobody can log in to the admin app. Set ADMIN_PASSWORD in .env (server/.env, or docker/.env in Docker) and restart, ' +
          'or run `pnpm --dir server run admin:set-password <username>`.',
      );
      return;
    }
    await this.users.ensureAdmin(username, password);
    this.logger.log(`Created admin user "${username}". You can now remove ADMIN_PASSWORD from .env (server/.env, or docker/.env in Docker).`);
  }
}
