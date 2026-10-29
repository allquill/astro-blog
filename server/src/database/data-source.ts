// DataSource for the TypeORM CLI, e.g.
//   pnpm run migration:generate src/database/migrations/AddSomething
// Reads the same settings as the app (server/.env, then the real environment).
import '../common/utc';
import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { validate } from '../config/env.validation';
import { typeOrmOptions } from './database.module';

try {
  process.loadEnvFile('.env');
} catch {
  // no server/.env — rely on the environment
}
export default new DataSource(typeOrmOptions(validate(process.env)) as DataSourceOptions);
