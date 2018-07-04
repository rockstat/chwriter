"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CHClient_1 = require("./CHClient");
const CHSync_1 = require("./CHSync");
const CHConfig_1 = require("./CHConfig");
const cctz_1 = require("cctz");
const object_1 = require("@app/helpers/object");
const object_flatten_1 = require("@app/helpers/object-flatten");
/**
 * Main writer class. Runs other nessesary components
 */
class CHWriter {
    /**
     *
     * @param deps DI
     */
    constructor(deps) {
        this.initialized = false;
        /**
         * Write data to ClickHouse
         * @param msg BaseIncomingMessage
         */
        this.write = (msg) => {
            const { time, ...rest } = msg;
            const unix = Math.round(time / 1000);
            if ('service' in rest && 'name' in rest) {
                const nameKey = msg.name.toLowerCase().replace(/\s/g, '_');
                const table = this.dest[`${rest.service}/${nameKey}`]
                    || this.dest[`${rest.service}/default`]
                    || this.dest[`other`];
                if ('data' in rest && object_1.isObject(rest.data)) {
                    const data = rest.data;
                    for (let prop of this.copyProps) {
                        if (rest[prop] !== undefined) {
                            data[prop] = rest[prop];
                        }
                    }
                    try {
                        data.date = cctz_1.format('%F', unix);
                        data.dateTime = cctz_1.format('%F %X', unix);
                        data.timestamp = time;
                        const row = this.formatter(table, data);
                        console.log(row);
                        this.chc.getWriter(table).push(row);
                    }
                    catch (error) {
                        console.error(`writer strange error`, error);
                    }
                }
                else {
                    this.log.warn('no data');
                    console.log(object_1.isObject(rest.data), 'data' in rest);
                }
            }
        };
        const { log, meter, config } = deps;
        this.log = log.for(this);
        this.meter = meter;
        this.copyProps = ['channel', 'uid', 'name', 'service', 'projectId', 'td'];
        const chcfg = this.options = CHConfig_1.CHConfigHandler.extend(config.get('clickhouse'));
        this.dest = this.options.destination;
        this.chc = new CHClient_1.CHClient(deps);
        this.chs = new CHSync_1.CHSync(chcfg, this.chc, deps);
        // main firmatter
        this.formatter = (table, record) => {
            const { cols, nested } = this.chs.tableConfig(table);
            if (!cols || !nested) {
                this.log.error({
                    cols,
                    nested
                });
                throw new Error('wrong table config');
            }
            return object_flatten_1.flatObject(record, nested, cols);
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
}
exports.CHWriter = CHWriter;
//# sourceMappingURL=Writer.js.map