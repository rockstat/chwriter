import { Deps } from "@app/AppServer";
import { Logger, Meter } from "@rockstat/rock-me-ts";
import { CHConfig, HandyCHRecord } from "@app/types";
import { CHClient } from "@app/clickhouse/client";
import { CHSync } from "@app/clickhouse/sync";
import { CHConfigHandler } from "@app/clickhouse/config";
import { format as dateFormat } from 'cctz';
import { isObject, arrayToObject } from '@app/helpers/object';
import { flatObject } from '@app/helpers/object-flatten';
import { CHMigrate } from "@app/clickhouse/migrate";

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
  chm: CHMigrate;
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
    this.options = CHConfigHandler.extend(config.get('clickhouse'));
    this.dest = this.options.destinations;
    this.chc = new CHClient(deps);
    this.chm = new CHMigrate(this.options, this.chc, deps)
    this.chs = new CHSync(this.options, this.chc, deps);
    this.copyProps = this.options.copy_props;
    // main firmatter
    this.formatter = (table: string, record: HandyCHRecord) => {
      const { cols, nested } = this.chs.tableConfig(table);
      if (!cols || !nested) {
        this.log.error({
          cols,
          nested
        });
        throw new Error('wrong table config');
      }
      const extra: Array<[string, any]> = []
      const obj = arrayToObject(flatObject(record, nested, cols, [], '_', extra));

      return obj
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
    await this.chm.run();
    await this.chs.sync();
    await this.chc.init();
    this.initialized = true;
    this.log.info('started');
  }

  /**
   * Write data to ClickHouse
   * @param msg BaseIncomingMessage
   */
  write = async (msg: HandyCHRecord) => {
    this.meter.tick('ch.write.called')
    const { time, ...rest } = msg;
    const unix = Math.round(time / 1000);

    if ('service' in rest && 'name' in rest) {
      const nameKey = msg.name.toLowerCase().replace(/\s/g, '_');
      const table = this.dest[`${rest.service}/${nameKey}`]
        || this.dest[`${rest.service}/default`]
        || this.dest[`other`];

      if (!table) {
        return {}
      }
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
          this.meter.tick('ch.write.success');
        } catch (error) {
          console.error(`writer strange error`, error);
        }
      } else {
        this.log.warn('no data');
        console.log(isObject(rest.data), 'data' in rest)
      }
    }
    return {};
  }
}
