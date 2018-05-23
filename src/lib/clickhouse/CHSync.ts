
import { DefaultDict, defaultDict } from '@app/lib/struct/DefaultDict';
import * as  Lazy from 'lazy.js';
import { WriterCHTableCols, WriterCHTableOpts, WriterClickHouseConfig } from '@app/types';
import { Deps } from '@app/AppServer';
import { Logger } from '@app/log';
import { CHClient } from '@app/lib/clickhouse/CHClient';

/**
 * Make create table SQL query
 * @param name table name
 * @param cols columns dict
 * @param tableOptions table options for clickhouse
 */
const showCreateTable = (name: string, cols: WriterCHTableCols, tableOptions: WriterCHTableOpts) => {
  let query = `CREATE TABLE ${name} (`;
  query += Object.keys(cols)
    .filter(c => !!cols[c])
    .map(c => ` "${c}" ${cols[c]}`)
    .join(', ');
  query += `) ENGINE = ${tableOptions['engine']}`;
  return query;
};

/**
 * Make ALTER table query
 * @param name table name
 * @param cols cols
 * @param table_options clickhouse options
 */
const showAlterTable = (name: string, cols: WriterCHTableCols, table_options: WriterCHTableOpts) => {
  let query = `ALTER TABLE ${name} `;
  query += Object.keys(cols)
    .filter(c => !!cols[c])
    .map(c => ` ADD COLUMN "${c}" ${cols[c]}`)
    .join(', ');
  return query;
};

/**
 * Calc difference
 * @param schemaCols cols defined in shema config
 * @param currentCols columnts in database at current monent
 */
const newCols = (schemaCols: Array<string>, currentCols: Array<string>) => {
  schemaCols.filter(col => {
    currentCols.indexOf(col) < 0
  })
}

/**
 * DB syncronisations system
 */
export class CHSync {
  log: Logger;
  client: CHClient;
  options: WriterClickHouseConfig;
  tablesCols: DefaultDict<{ [k: string]: string }>;
  tablesNested: DefaultDict<Set<string>>;

  constructor(options: WriterClickHouseConfig, client: CHClient, { logger }: Deps) {
    this.log = logger.for(this);
    this.client = client;
    this.options = Object.assign({}, options);
  }

  async discover() {
    // Preparing tables dicts
    this.tablesCols = defaultDict<Object>(Object) as DefaultDict<{ [k: string]: string }>;
    this.tablesNested = defaultDict<Set<string>>(Set);
    // Reading database structure
    const list = await this.client.tablesColumns();
    // Detecting nested fields
    for (const row of list) {
      const { table, name, type } = row;
      const [key, sub] = name.split('.');
      this.tablesCols.get(table)[name] = type;
      if (sub) {
        this.tablesNested.get(table).add(key);
      }
    }
    this.log.info({
      tables: this.tablesCols.keys().join(', ')
    }, 'Discovered');
  }

  /**
   * Run syncronization procedure
   */
  async sync(): Promise<void> {
    const { tables, base, sync } = this.options;
    this.log.info('initial discover...');
    await this.discover();
    if (sync !== true) {
      this.log.info('db sync disabled. skipping')
      return
    }
    for (const [table, conf] of Object.entries(tables)) {
      const exists = this.tablesCols.has(table);
      const currTable = this.tablesCols.get(table);
      let { _options, ...customCols } = conf;
      // Handling inheritance
      if (_options && _options.extend && tables[_options.extend]) {
        const { _options: inhOptions, ...ihnCustomCols } = tables[_options.extend];
        _options = Object.assign({}, inhOptions, _options);
        customCols = Object.assign({}, ihnCustomCols, customCols);
      }
      const schemaCols = Object.assign(
        {},
        base,
        customCols
      );
      // creating table
      if (!exists) {
        this.log.info(`Creating table ${table}`);
        const query = showCreateTable(table, schemaCols, _options);
        await this.client.execute(query);
      }
      // calculating difference and apply changes
      else {
        const currTableKeys = Lazy(currTable).keys();
        const appendCols = Lazy(schemaCols)
          .keys()
          .without(currTableKeys.toArray())
          .toArray();
        if (appendCols.length > 0) {
          this.log.info({
            new_cols: appendCols.join(', ')
          }, `Altering table ${table}`);
          const query = showAlterTable(
            table,
            Lazy(schemaCols)
              .pick(appendCols)
              .toObject(),
            _options
          );
          await this.client.execute(query);
        }
      }
    }
    // rediscover db structure
    await this.discover();
    this.log.info('Schema sync done');
  }

  //take table config
  tableConfig(table: string) {
    return {
      cols: this.tablesCols.get(table),
      nested: this.tablesNested.get(table)
    };
  }
}
