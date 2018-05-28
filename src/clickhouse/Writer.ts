import { Deps } from "@app/AppServer";
import { Logger, MeterFacade, Meter } from "rock-me-ts";
import { CHConfig } from "@app/types";
import { CHClient } from "./CHClient";
import { CHSync } from "./CHSync";
import { CHConfigHandler } from "./CHConfig";
import { format as dateFormat } from 'cctz';
import { unzip } from '../struct/unzip';

/**
 * Check is Object
 */
const isObject = (o: any) => {
  (!!o && typeof o === 'object' && Object.prototype.toString.call(o) === '[object Object]')
};
// Stub
const emptySet = new Set();


type StructChild = {
  [k: string]: any;
};
type CHRecord = {
  [k: string]: any;
};

/**
 * Funtion to transform nested json structure to
 * flat database-like considering locatins rules
 * @param child {Object}
 * @param nested {Set}
 * @param cols {Object}
 * @param path {Array<string>}
 * @param separator {string}
 * @param noCheck {boolean}
 * @return {Object}
 */
const flatObject = (child: StructChild, nested: Set<string> | null,
  cols: StructChild, path: Array<string> = [], separator = '_',
  noCheck = false): StructChild => {
  //
  const acc: StructChild = {};
  const root_path = path.join(separator);
  const kv: StructChild | null = (root_path && nested && nested.has(root_path)) ? {} : null;
  Object.keys(child)
    .forEach((key: string) => {
      const val = child[key];
      const isObj = isObject(val);
      const itemPath = path.concat(key).join(separator);
      if (kv) {
        if (isObj) {
          Object.assign(
            kv,
            flatObject(val, null, {}, [], separator, true)
          );
        }
        else if (cols[itemPath]) {
          acc[itemPath] = val;
        }
        else {
          kv[key] = val;
        }
      }
      else {
        if (isObj) {
          Object.assign(
            acc,
            flatObject(val, nested, cols, path.concat([key]), separator, noCheck)
          );
        }
        else if (cols[itemPath] || noCheck) {
          acc[itemPath] = val;
        }
        else {
          // console.warn(`!! not found path:${path.join('.')}, key:${key}, val:${val}`);
        }
      }
    });
  return Object.assign(
    acc,
    kv && flatObject(unzip(kv, String, String), null, cols, [root_path], '.', true)
  );
};

/**
 * Main writer class. Runs other nessesary components
 */
export class CHWriter {
  formatter: (table: string, record: { [k: string]: any; }) => any;
  log: Logger;
  meter: Meter;
  options: CHConfig;
  initialized: boolean = false;
  chc: CHClient;
  chs: CHSync;

  /**
   *
   * @param deps DI
   */
  constructor(deps: Deps) {
    const { log, meter, config } = deps;
    this.log = log.for(this)
    this.meter = meter;
    const chcfg = this.options = CHConfigHandler.extend(config.get('clickhouse'));
    this.chc = new CHClient(deps);
    this.chs = new CHSync(chcfg, this.chc, deps);
    // main firmatter
    this.formatter = (table: string, record: CHRecord) => {
      const { cols, nested } = this.chs.tableConfig(table);
      if (!cols || !nested) {
        this.log.error({
          cols,
          nested
        });
        throw new Error('wrong table config');
      }
      return flatObject(record, nested, cols);
    };
  }

  /**
   * Prepare database structure and
   * init dependend componenets
   */
  async init() {
    if (this.initialized) {
      throw new Error('Already initialized');
    }
    await this.chs.sync();
    await this.chc.init();
    this.initialized = true;
    this.log.info('started');
  }

  /**
   * Main writer
   */
  write = (msg: CHRecord) => {
    const { time, ...rest } = msg;
    const unix = Math.round(time / 1000);
    const key = msg.name.toLowerCase().replace(/\s/g, '_');
    const table = this.options.locations[rest.channel][key] || this.options.locations[rest.channel].default;
    try {
      rest.date = dateFormat('%F', unix);
      rest.dateTime = dateFormat('%F %X', unix);
      rest.timestamp = time;
      const row = this.formatter(table, rest);
      this.chc.getWriter(table).push(row);
    } catch (error) {
      console.error(`strange error`, error);
    }
  }
}
