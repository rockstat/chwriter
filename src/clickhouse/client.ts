import * as Bluebird from 'bluebird';
// import fetch from 'node-fetch';

import * as fs from 'fs';
import * as qs from 'qs';
import { Deps } from '@app/AppServer';
import { Logger, MeterFacade } from '@rockstat/rock-me-ts';
import { CHConfig, HandyCHRecord } from '@app/types';
import { CHBufferDust, CHQueryParams, CHWritersDict } from '@app/types';
import { CHBuffer } from '@app/clickhouse/buffer';
import { METHOD_POST } from '@app/constants';
import { dsnParse } from './lib';

const fsAsync: { [k: string]: (...args: any[]) => Promise<any> } = Bluebird.promisifyAll(fs) as any;
const { unlinkAsync, writeFileAsync } = fsAsync
// const unlinkAsync = Bluebird.promisify(unlink);
// const writeFileAsync = Bluebird.promisify(writeFile);


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
  options: CHConfig;
  params: CHQueryParams;
  writers: CHWritersDict = {};
  timeout: number = 5000;
  emergency_dir: string;
  meter: MeterFacade;
  defaultOptions = {
    uploadInterval: 5,
    dsn: 'http://default@localhost:8123'
  };

  constructor(deps: Deps) {
    const { log, config, meter } = deps;
    this.options = { ...this.defaultOptions, ...config.get('clickhouse') };

    
    const { dsn, uploadInterval } = this.options;
    this.log = log.for(this);

    console.log('Default options', {opts: this.options});

    this.log.info('Initializing ClickHouse client', { uploadInterval, dsn });
    const { port, hostname, protocol, db, user, password } = dsnParse(dsn);
    this.db = db;
    this.params = { database: this.db };
    this.meter = meter;
    if (user) {
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
   * Write object to the ClickHouse database
   * @param table table name in CH
   * @param struct Writable object
   */
  push(table: string, struct: HandyCHRecord): void {
    this.getWriter(table).push(struct)
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
      // timeout: this.timeout
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
    // const res = await fetch(queryUrl, { timeout: this.timeout });
    const res = await fetch(queryUrl);
    responseBody = await res.text();
    if (!res.ok) {
      throw new Error(responseBody);
    }
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
  exceptWrite(dust: CHBufferDust) {
    const fn = `${this.options.emergency_dir}/${dust.time}.json`;
    writeFileAsync(fn, dust.buffer)
      .then(() => this.log.warn(`saved emergency file: ${fn}`))
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
      // Delay writing of tables
      setTimeout(() => {
        const writer = this.writers[table];
        this.writers[table] = undefined;
        writer.close()
          .then((dust: CHBufferDust) => {
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
  handleBuffer(dust: CHBufferDust): void {
    // Skip if no data
    const requestTime = this.meter.timenote('ch.upload')
    const queryUrl = this.url + '/?' + qs.stringify(
      Object.assign(
        {},
        this.params,
        { query: `INSERT INTO ${dust.table} FORMAT JSONEachRow` }
      )
    );
    (async () => {
      let res;
      try {
        res = await fetch(queryUrl, {
          method: 'POST',
          body: dust.buffer,
          // timeout: this.timeout
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`body: ${body}`);
        }
        this.meter.tick('ch.upload.ok');
        requestTime();
      } catch (error) {
        requestTime()
        this.meter.tick('ch.upload.error')
        this.log.error(`CH write error: ${error.message}`, error, res);
        this.exceptWrite(dust);
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
