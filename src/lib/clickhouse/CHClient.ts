import { promisify } from 'bluebird';
import fetch from 'node-fetch';
import { unlink } from 'fs';
import * as qs from 'qs';
import { Deps } from '@app/AppServer';
import { Logger } from '@app/log';
import { parse as urlParse } from 'url';
import { WriterClickHouseConfig, QueryParams } from '@app/types';
import { CHBuffer, BufferDust } from '@app/lib/clickhouse/CHBuffer';
import { METHOD_POST } from '@app/constants';

type WritersDict = {
  [k: string]: any
};

const unlinkAsync = promisify(unlink)

/**
 * Base ClickHouse lib.
 * Used for raw data queries and modifications
 * Also provide object-push style writing
 * @property {ServiceStat} stat Internal stat service
 */
export class CHClient {

  getWriter: (table: any) => any;
  log: Logger;
  url: string;
  db: string;
  options: WriterClickHouseConfig;
  params: QueryParams = {};
  writers: WritersDict = {};
  timeout: number = 5000;
  uploadInterval: number = 2000;

  constructor(deps: Deps) {

    const { logger, config } = deps;
    this.log = logger.for(this);
    const options = config.get('clickhouse');
    const { dsn, uploadInterval } = options;
    this.uploadInterval = uploadInterval;
    this.log.info('Starting ClickHouse client', { uploadInterval, dsn: dsn });
    const { port, hostname, protocol, path, auth } = urlParse(dsn);
    this.db = (path || '').slice(1);
    if (auth) {
      const [user, password] = auth.split(':');
      this.params = { user, password, database: this.db, ...this.params };
    }
    this.url = `${protocol}//${hostname}:${port}`;
    this.getWriter = (table) => {
      if (!this.writers[table]) {
        this.writers[table] = new CHBuffer({ table }, deps);
      }
      return this.writers[table];
    };
  }

  /**
   * Setup upload interval
   */
  init(): void {
    setInterval(() => {
      this.flushWriters()
    }, this.uploadInterval * 1000);
    this.log.info('started upload timer');
  }

  /**
   * Execution data modification query
   * @param query
   */
  async execute(body: string): Promise<string> {

    const queryUrl = this.url + '/?' + qs.stringify(this.params);
    let responseBody;
    try {
      const res = await fetch(queryUrl, {
        method: METHOD_POST,
        body: body,
        timeout: this.timeout
      });
      responseBody = await res.text();
      if (res.ok) {
        return responseBody;
      }
    } catch (error) {
      throw error;
    }
    throw new Error(`Wrong HTTP code from ClickHouse: ${responseBody}`);
  }

  /**
   * Executes query and return resul
   * @param query
   */
  async query(query: string): Promise<string> {

    const queryUrl = this.url + '/?' + qs.stringify(Object.assign({}, this.params, { query }));
    let responseBody;
    try {
      const res = await fetch(queryUrl, { timeout: this.timeout });
      responseBody = await res.text();
      if (res.ok) {
        return responseBody;
      }
    } catch (error) {
      throw error;
    }
    throw new Error(`Wrong HTTP code from ClickHouse: ${responseBody}`);
  }

  /**
   * Executes query and return stream
   * @param query
   */
  querySream(query: QueryParams) {
    throw new Error('Not implemented');
  }

  /**
   * Read tables structure from database
   */
  tablesColumns(): Promise<Array<{ table: string, name: string, type: string }>> {
    return this.query(`SELECT table, name, type FROM system.columns WHERE database = '${this.db}' FORMAT JSON`)
      .then(result => JSON.parse(result.toString()))
      .then(parsed => parsed.data);
  }

  /**
   * Flushing data
   */
  flushWriters(): void {
    const tables = Object.entries(this.writers).filter(e => e[1] !== undefined).map(e => e[0]).sort();
    const delay = Math.round(this.uploadInterval / tables.length);
    let i = 0;

    for (const table of tables) {

      setTimeout(() => {
        const writer = this.writers[table];
        this.writers[table] = undefined;
        this.log.debug(`uploding ${table}`);

        writer.close()
          .then(({ table, fileName, buffer }: BufferDust) => {
            this.handleBuffer({
              table,
              fileName,
              buffer
            });
          })
          .catch((error: Error) => {
            this.log.error(error, 'File close error');
          });
      }, delay * i++);
    }
  }

  /**
   * Uploading each-line-json to ClickHouse
   */
  handleBuffer({ table, fileName, buffer }: BufferDust): void {
    // Skip if no data
    if (fileName) {
      if (!buffer.byteLength) {
        this.unlinkFile(fileName);
        return;
      }
    }
    const queryUrl = this.url + '/?' + qs.stringify(
      Object.assign(
        {},
        this.params,
        { query: `INSERT INTO ${table} FORMAT JSONEachRow` }
      )
    );
    (async () => {
      try {
        const res = await fetch(queryUrl, {
          method: 'POST',
          body: buffer,
          timeout: this.timeout
        });
        const body = await res.text();
        if (res.ok) {
          if (fileName) {
            await this.unlinkFile(fileName);
          }
          return;
        }
        this.log.error({
          body: body,
          code: res.status
        }, 'Wrong code');
      } catch (error) {
        this.log.error(error, 'Error uploading to CH');
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
