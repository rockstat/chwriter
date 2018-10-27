import { Deps } from "@app/AppServer";
import { CHClient } from "@app/clickhouse/client";
import { CHConfig } from "@app/types";
import { Logger } from "@rockstat/rock-me-ts";
import { sync as globSync } from 'glob';
import { resolve, join, basename } from 'path';
import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';



export interface MigrationRecord {
  name: string;
  timestamp: string;
}

export type MigrationFn = (client: CHClient) => Promise<any>;
export type MigrationFile = [string, MigrationFn]

export class CHMigrate {
  client: CHClient;
  log: Logger;
  migrationsTable: string = 'migrations';
  database: string = 'stats';
  db_table: string;
  migrationsDir: string;
  constructor(option: CHConfig, client: CHClient, deps: Deps) {
    this.client = client;
    this.db_table = `${this.database}.${this.migrationsTable}`;
    this.log = deps.log.for(this);
    this.migrationsDir = resolve(join(__dirname, '..', '..', 'migrations'));
  }

  async run() {

    this.log.info('Ensure database exists');
    await this.client.execute(`CREATE DATABASE IF NOT EXISTS ${this.database}`);
    await this.client.execute(`CREATE TABLE IF NOT EXISTS ${this.db_table} (name String, timestamp UInt64) ENGINE = Log`);

    this.log.info('Fetching migrations state');
    const res = (await this.client.query(`SELECT * FROM ${this.db_table} FORMAT JSON`));
    if (!res) {
      throw new Error('Error during loading migrations list');
    }
    const state: Array<string> = JSON.parse(res).data.map((row: MigrationRecord) => row.name);

    this.log.info('Executing migrations')
    const parts = globSync(
      `${this.migrationsDir}/**/*.yml`, { nosort: true });

    for (const fn of parts) {
      const name = basename(fn);
      if (!state.includes(name)) {
        const now = +new Date();
        const items: Array<string> = safeLoad(readFileSync(fn).toString());
        this.log.info(`---> ${name}`);
        for(const item of items){
          await this.client.execute(item);
        }
        this.client.execute(`INSERT INTO ${this.db_table} (name, timestamp) VALUES ('${name}', ${now})`);
      }
    }
  }
}
