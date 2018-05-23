import { promisify } from 'bluebird';
import fetch from 'node-fetch';
import { unlink, writeFile } from 'fs';
import * as qs from 'qs';
import { Deps } from '@app/AppServer';
import { Logger } from '@app/log';
import { parse as urlParse } from 'url';
import { ClickHouseConfig } from '@app/types';
import { CHBuffer, BufferDust } from '@app/lib/clickhouse/CHBuffer';
import { METHOD_POST, METHOD_OPTIONS } from '@app/constants';

type WritersDict = {
  [k: string]: any
};

interface CHQueryParams {
  user?: string;
  password?: string;
  database: string;
  query?: string;
}

const unlinkAsync = promisify(unlink);
const writeFileAsync = promisify(writeFile);

/**
 * Base ClickHouse lib.
 * Used for raw data queries and modifications
 * Also provide object-push style writing
 * @property {ServiceStat} stat Internal stat service
 */
export class CHClient {
  log: Logger;
  url: string;
  db: string;
  options: ClickHouseConfig;
  params: CHQueryParams;
  writers: WritersDict = {};
  timeout: number = 5000;
  emergency_dir: string;

  constructor(deps: Deps) {
    const { logger, config } = deps;
    const options = this.options = config.get('clickhouse');
    const { dsn } = options;
    this.log = logger.for(this);
    this.log.info('Starting ClickHouse client', { uploadInterval: options.uploadInterval, dsn: dsn });
    const { port, hostname, protocol, path, auth } = urlParse(dsn);
    this.db = (path || '').slice(1);
    this.params = { database: this.db };
    if (auth) {
      const [user, password] = auth.split(':');
      this.params = { user, password, ...this.params };
    }
    this.url = `${protocol}//${hostname}:${port}`;
  }

  /**
   *
   * @param table table name
   */
  getWriter(table: string): CHBuffer {
    if (!this.writers[table]) {
      this.writers[table] = new CHBuffer({ table });
    }
    return this.writers[table];
  }
  /**
   * Setup upload interval
   */
  init(): void {
    setInterval(() => {
      this.flushWriters()
    }, this.options.uploadInterval * 1000);
    this.log.info('started upload timer');
  }

  /**
   * Execution data modification query
   * @param query
   */
  async execute(body: string): Promise<string | undefined> {
    const queryUrl = this.url + '/?' + qs.stringify(this.params);
    let responseBody;
    // try {
    const res = await fetch(queryUrl, {
      method: METHOD_POST,
      body: body,
      timeout: this.timeout
    });
    responseBody = await res.text();
    if (!res.ok) {
      throw new Error(responseBody);
    }
    // } catch (error) {
    //   throw error;
    // }
    return responseBody;
  }

  /**
   * Executes query and return resul
   * @param query
   */
  async query(query: string): Promise<string | undefined> {
    const queryUrl = this.url + '/?' + qs.stringify(Object.assign({}, this.params, { query }));
    let responseBody;
    // try {
    const res = await fetch(queryUrl, { timeout: this.timeout });
    responseBody = await res.text();
    if (!res.ok) {
      throw new Error(responseBody);
    }
    // } catch (error) {
    //   this.log.error('CH write error', error);
    // }
    return responseBody;
  }

  /**
   * Executes query and return stream
   * @param query
   */
  querySream(query: string) {
    throw new Error('Not implemented');
  }

  /**
   * Read tables structure from database
   */
  tablesColumns(): Promise<Array<{ table: string, name: string, type: string }>> {
    return this.query(`SELECT table, name, type FROM system.columns WHERE database = '${this.db}' FORMAT JSON`)
      .then((result) => {
        return result ? JSON.parse(result.toString()).data : [];
      });
  }

  /**
   * Emergincy write in file
   */
  exceptWrite(dust: BufferDust) {
    const fn = `${this.options.emergency_dir}/${dust.time}.json`;
    writeFileAsync(fn, dust.buffer)
      .then(_ => this.log.info(`saved emergency file: ${fn}`))
      .catch(error => this.log.error(`cant create emergency ${fn}`));
  }

  /**
   * Flushing data
   */
  flushWriters(): void {
    const tables = Object.entries(this.writers)
      .filter(e => !!e[1])
      .map(e => e[0]).sort();
    for (const [i, table] of tables.entries()) {
      setTimeout(() => {
        const writer = this.writers[table];
        this.writers[table] = undefined;
        writer.close()
          .then((dust: BufferDust) => {
            this.log.debug(`uploding ${table} batch id:${dust.time}`);
            this.handleBuffer(dust);
          })
          .catch((error: Error) => {
            this.log.error('CH write error', error);
          });
      }, Math.round(this.options.uploadInterval / tables.length) * i);
    }
  }

  /**
   * Uploading each-line-json to ClickHouse
   */
  handleBuffer(dust: BufferDust): void {
    // Skip if no data
    const queryUrl = this.url + '/?' + qs.stringify(
      Object.assign(
        {},
        this.params,
        { query: `INSERT INTO ${dust.table} FORMAT JSONEachRow` }
      )
    );
    (async () => {
      try {
        const res = await fetch(queryUrl, {
          method: 'POST',
          body: dust.buffer,
          timeout: this.timeout
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body);
        }
      } catch (error) {
        this.exceptWrite(dust);
        this.log.error('CH write error', error);
      }
    })();
  }

  /**
   * Remove uploaded file
   * @param filename
   */
  unlinkFile(fileName: string) {
    return unlinkAsync(fileName)
      .then(() => {
        this.log.debug('file unlinked');
      });
  }
}
