import { Global, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from './env.validation';

/** Typed access to the validated environment (see env.validation.ts). */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  get<K extends keyof EnvironmentVariables>(key: K): EnvironmentVariables[K] {
    return this.config.get(key, { infer: true });
  }
}

@Global()
@Module({ providers: [AppConfig], exports: [AppConfig] })
export class AppConfigModule {}
