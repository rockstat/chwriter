import { Deps } from "@app/AppServer";
import { Logger, Meter } from "rock-me-ts";
import { CHConfig } from "@app/types";
import { CHClient } from "./CHClient";
import { CHSync } from "./CHSync";
import { CHConfigHandler } from "./CHConfig";
import { format as dateFormat } from 'cctz';
import { isObject } from '@app/helpers/object';
import { flatObject } from '@app/helpers/object-flatten';

type CHRecord = {
  [k: string]: any;
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
  copyProps: string[];
  dest: CHConfig['destinations']
  /**
   *
   * @param deps DI
   */
  constructor(deps: Deps) {
    const { log, meter, config } = deps;
    this.log = log.for(this)
    this.meter = meter;
    this.copyProps = ['channel', 'uid', 'name', 'service', 'projectId', 'td']
    const chcfg = this.options = CHConfigHandler.extend(config.get('clickhouse'));
    this.dest = this.options.destinations;
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
   * Write data to ClickHouse
   * @param msg BaseIncomingMessage
   */
  write = (msg: CHRecord) => {
    const { time, ...rest } = msg;
    const unix = Math.round(time / 1000);
    if ('service' in rest && 'name' in rest) {
      const nameKey = msg.name.toLowerCase().replace(/\s/g, '_');
      const table = this.dest[`${rest.service}/${nameKey}`]
        || this.dest[`${rest.service}/default`]
        || this.dest[`other`];

      if ('data' in rest && isObject(rest.data)) {
        const data = rest.data;
        for (let prop of this.copyProps) {
          if (rest[prop] !== undefined) {
            data[prop] = rest[prop];
          }
        }
        try {
          data.date = dateFormat('%F', unix);
          data.dateTime = dateFormat('%F %X', unix);
          data.timestamp = time;
          const row = this.formatter(table, data);
          this.chc.getWriter(table).push(row);
        } catch (error) {
          console.error(`writer strange error`, error);
        }
      } else {
        this.log.warn('no data');
        console.log(isObject(rest.data), 'data' in rest)
      }
    }
  }
}
