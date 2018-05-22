import { promisify } from 'bluebird';
import fetch from 'node-fetch';
import { unlink } from 'fs';
import * as qs from 'qs';
import { Deps } from '@app/AppServer';
import { Logger } from '@app/log';
import { parse as urlParse } from 'url';
import { WriterClickHouseConfig, QueryParams } from '@app/types';
import { CHBufferWriter, BuffDust } from '@app/lib/CHBufferWriter';
import { METHOD_POST } from '@app/constants';

// const fs = Promise.promisifyAll(require('fs'));
// const lazy = require('lazy.js');

// const CHBufferWriter = require('./CHBufferWriter');


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
  dsn: string;
  url: string;
  db: string;
  options: WriterClickHouseConfig;
  params: QueryParams = {};
  uploadInterval: number;
  writers: { [k: string]: any } = {};
  timeout: number = 5000;

  constructor(deps: Deps) {

    const { logger, config } = deps;

    this.log = logger.for(this);

    const options = config.get('clickhouse');
    const { dsn, uploadInterval } = options;

    this.uploadInterval = uploadInterval;
    this.dsn = dsn;

    this.log.info('Starting ClickHouse client', { dsn: this.dsn });

    const { port, hostname, protocol, path, auth } = urlParse(dsn);
    this.db = (path || '').slice(1);

    if (auth) {
      const [user, password] = auth.split(':');
      this.params = { user, password, database: this.db, ...this.params };
    }

    this.url = `${protocol}//${hostname}:${port}`;
    this.writers = new Map();

    this.getWriter = (table) => {
      if (!this.writers[table]) {
        this.writers[table] = new CHBufferWriter({ table }, deps);
      }
      return this.writers[table];
    };
  }

  init(): void {
    setInterval(() => this.flushWriters(), this.options.uploadInterval);
    this.log.info('Started');
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
        // this.stat.mark('clickhouse.query.success');
        return responseBody;
      }

    } catch (error) {
      // this.stat.mark('clickhouse.error.upload');
      throw error;
    }

    // this.stat.mark('clickhouse.error.upload');
    throw new Error(`Wrong HTTP code from ClickHouse: ${responseBody}`);
  }

  /**
   * Executes query and return resul
   * @param query <string> SQL query
   * @return Promise<Buffer>
   */
  async query(query: string): Promise<string> {

    const queryUrl = this.url + '/?' + qs.stringify(Object.assign({}, this.params, { query }));
    let responseBody;

    try {

      // const startAt = timeMark();

      const res = await fetch(queryUrl, {timeout: this.timeout});
      responseBody = await res.text();

      if (res.ok) {
        // this.stat.histPush(`clickhouse.query.success`, timeDuration(startAt));
        return responseBody;
      }

    } catch (error) {
      // this.stat.mark('`clickhouse.error.upload');
      throw error;
    }

    // this.stat.mark('clickhouse.error.upload');
    throw new Error(`Wrong HTTP code from ClickHouse: ${responseBody}`);

  }

  /**
   * Executes query and return stream
   * @param query <string> SQL query
   * @return Stream
   */
  querySream(query: QueryParams) {
    throw new Error('Not implemented');
  }

  /**
   * Returns DB structure
   * @return Promise<Buffer>
   */
  tablesColumns(): Promise<Array<{ table: string, name: string, type: string }>> {
    return this.query(`SELECT table, name, type FROM system.columns WHERE database = '${this.db}' FORMAT JSON`)
      .then(result => JSON.parse(result.toString()))
      .then(parsed => parsed.data);
  }


  /**
   * Flushing writers
   */
  flushWriters(): void {
    const tables = [...this.writers.keys()].sort();
    const delay = Math.round(this.options.uploadInterval / tables.length);
    let i = 0;

    for (const table of tables) {

      setTimeout(() => {
        const writer = this.writers.get(table);
        this.writers.delete(table);
        this.log.debug(`uploding ${table}`);

        writer.close()
          .then(({ table, fileName, buffer }: BuffDust) => {
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
  handleBuffer({ table, fileName, buffer }: BuffDust): void {

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
    // this.stat.mark(`clickhouse.upload.try`);
    // const startAt = timeMark();

    (async () => {
      try {
        const res = await fetch(queryUrl, {
          method: 'POST',
          body: buffer,
          timeout: this.timeout
        });
        const body = await res.text();

        if (res.ok) {
          // this.stat.histPush(`clickhouse.upload.success`, timeDuration(startAt));
          if (fileName) {
            return await this.unlinkFile(fileName);
          }
        }

        this.log.error({
          body: body,
          code: res.status
        }, 'Wrong code');

      } catch (error) {
        this.log.error(error, 'Error uploading to CH');
      }

      // this.stat.histPush(`clickhouse.error.upload`, timeDuration(startAt));

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
