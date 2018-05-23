import { readFileSync } from 'fs';
import { safeLoadAll } from 'js-yaml';
import { render as ejsRender, Options as EjsOptions } from 'ejs';
import { sync as globSync } from 'glob';
import * as dotenv from 'dotenv';
import * as mergeOptions from 'merge-options';
import * as consts from '@app/constants';
import {
  ClickHouseConfig,
  WriterCHTableDefinition,
  PinoConfig,
  RootConfig,
  Envs,
  RedisConfig,
} from '../types';
import { ENV_PROD, ENV_STAGE, ENV_DEV } from '@app/constants';

// Loading all dotenv
dotenv.config();
dotenv.config({ path: '.env.local' });

export class Configurer {

  configDir: string = './config';
  config: RootConfig;
  ch: ClickHouseConfig;
  env: Envs;
  ejsConfig: EjsOptions = {}

  /**
   * Reading all accessible configuration files including custom
   */
  constructor() {
    const parts = globSync(`${this.configDir}/**/*.yml`, { nosort: true })
      .map(file => readFileSync(file).toString());
    const yaml = ejsRender(parts.join('\n'), { env: process.env, ...consts }, this.ejsConfig);
    this.config = mergeOptions({}, ...<object[]>safeLoadAll(yaml).filter(cfg => cfg !== null && cfg !== undefined));
    this.env = this.config.env = Configurer.env;
    const { clickhouse } = this.config;
    if (clickhouse) {
      this.ch = this.handleCHExtend(clickhouse);
    }
  }

  /**
   * Spectial getters
   */
  get logConfig(): PinoConfig { return this.config.log.pino; }
  get redis(): RedisConfig { return this.config.redis; }
  get clickhouse(): ClickHouseConfig { return this.ch; }


  /**
   * Unisersal config getter
   * @param section
   */
  get<S extends keyof RootConfig>(section: S): RootConfig[S] {
    return this.config[section];
  }

  /**
   * Handling ClickHouse table extendability via _options: extend: basename
   * @param config ClickHouse configuration
   */
  handleCHExtend(config: ClickHouseConfig): ClickHouseConfig {
    const { base, tables, ...rest } = config;
    for (const table of Object.keys(tables)) {
      const definition = tables[table];
      const { _options, ...cols } = definition;
      // excluding extend action
      const { extend, ...options } = _options;
      // extenxing
      if (extend && tables[extend]) {
        // extracting source table schema ans opts
        const { _options: ioptions, ...icols } = tables[extend];
        // extending base table
        Object.assign(options, ioptions);
        Object.assign(cols, icols);
      }
      // Moving back;
      Object.assign(definition, base, cols, { _options });
    }
    return { base, tables, ...rest };
  }

  /**
   * Detect ENV
   */
  static get env(): Envs {
    switch (process.env.NODE_ENV) {
      case 'production':
      case 'prod':
        return ENV_PROD;
      case 'stage':
        return ENV_STAGE;
      default:
        return ENV_DEV;
    }
  }
}
