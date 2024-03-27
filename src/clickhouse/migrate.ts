import { Deps } from "@app/AppServer";
import { CHClient } from "@app/clickhouse/client";
import { CHConfig } from "@app/types";
import { Logger } from "@rockstat/rock-me-ts";
import { sync as globSync } from 'glob';
import { resolve, join, basename, parse as pathParse } from 'path';
import { readFileSync } from 'fs';
import { load as yamlLoad } from 'js-yaml';



export interface MigrationRecord {
  name: string;
  timestamp: string;
}

const fnName = (fullpath: string) => pathParse(fullpath).name;
const bnSort = (fn1: string, fn2: string) => fnName(fn1) >= fnName(fn2) ? 1 : -1;


export type MigrationFn = (client: CHClient) => Promise<any>;
export type MigrationFile = [string, MigrationFn]

export class CHMigrate {
  client: CHClient;
  log: Logger;
  migrationsTable: string = '"migrations"';
  database: string = '"stats"';
  db_table: string;
  migrationsDir: string;
  constructor(option: CHConfig, client: CHClient, deps: Deps) {
    this.client = client;
    this.db_table = `${this.database}.${this.migrationsTable}`;
    this.log = deps.log.for(this);
    this.migrationsDir = resolve(join(__dirname, '..', '..', 'migrations'));
  }

  /**
   * Read migrations from migrations folder, order by filename (without folder and extension)
   */
  async run() {

    this.log.info('Ensuring the database and the migrations exists');
    await this.client.execute(`CREATE DATABASE IF NOT EXISTS ${this.database}`);
    await this.client.execute(`CREATE TABLE IF NOT EXISTS ${this.db_table} (name String, timestamp UInt64) ENGINE = Log`);
    this.log.info('Fetching migrations records');
    const rawState = (await this.client.query(`SELECT * FROM ${this.db_table} FORMAT JSON`));
    if (!rawState) {
      throw new Error('Error during loading migrations list');
    }
    const state: Array<string> = JSON.parse(rawState).data.map((row: MigrationRecord) => row.name);
    this.log.info('Executing migrations')
    const migrations = globSync(`${this.migrationsDir}/**/*.yml`).sort(bnSort);
    for (const fn of migrations) {
      const name = fnName(fn);
      if (!state.includes(name)) {
        const now = +new Date();
        const records = yamlLoad(readFileSync(fn).toString());

        this.log.debug('loaded migrations', records)
        if (!Array.isArray(records)) {
          this.log.info(`--- wrong migration format ---> ${name}`);
        } else {
          this.log.info(`--- applying ---> ${name}`);
          for (const record of records) {
            await this.client.execute(record);
          }
          // write migration state
          await this.client.execute(`INSERT INTO ${this.db_table} (name, timestamp) VALUES ('${name}', ${now})`);
        }
      }
    }
  }
}
