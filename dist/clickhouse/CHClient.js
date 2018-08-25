"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const node_fetch_1 = require("node-fetch");
const fs_1 = require("fs");
const qs = require("qs");
const url_1 = require("url");
const CHBuffer_1 = require("./CHBuffer");
const constants_1 = require("@app/constants");
const unlinkAsync = Bluebird.promisify(fs_1.unlink);
const writeFileAsync = Bluebird.promisify(fs_1.writeFile);
/**
 * Base ClickHouse lib.
 * Used for raw data queries and modifications
 * Also provide object-push style writing
 * @property {ServiceStat} stat Internal stat service
 */
class CHClient {
    constructor(deps) {
        this.writers = {};
        this.timeout = 5000;
        const { log, config, meter } = deps;
        const options = this.options = config.get('clickhouse');
        const { dsn } = options;
        this.log = log.for(this);
        this.log.info('Starting ClickHouse client', { uploadInterval: options.uploadInterval, dsn: dsn });
        const { port, hostname, protocol, path, auth } = url_1.parse(dsn);
        this.db = (path || '').slice(1);
        this.params = { database: this.db };
        this.meter = meter;
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
    getWriter(table) {
        if (!this.writers[table]) {
            this.writers[table] = new CHBuffer_1.CHBuffer({ table });
        }
        return this.writers[table];
    }
    /**
     * Setup upload interval
     */
    init() {
        setInterval(() => {
            this.flushWriters();
        }, this.options.uploadInterval * 1000);
        this.log.info('started upload timer');
    }
    /**
     * Execution data modification query
     * @param query
     */
    async execute(body) {
        const queryUrl = this.url + '/?' + qs.stringify(this.params);
        let responseBody;
        // try {
        const res = await node_fetch_1.default(queryUrl, {
            method: constants_1.METHOD_POST,
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
    async query(query) {
        const queryUrl = this.url + '/?' + qs.stringify(Object.assign({}, this.params, { query }));
        let responseBody;
        // try {
        const res = await node_fetch_1.default(queryUrl, { timeout: this.timeout });
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
    querySream(query) {
        throw new Error('Not implemented');
    }
    /**
     * Read tables structure from database
     */
    tablesColumns() {
        return this.query(`SELECT table, name, type FROM system.columns WHERE database = '${this.db}' FORMAT JSON`)
            .then((result) => {
            return result ? JSON.parse(result.toString()).data : [];
        });
    }
    /**
     * Emergincy write in file
     */
    exceptWrite(dust) {
        const fn = `${this.options.emergency_dir}/${dust.time}.json`;
        writeFileAsync(fn, dust.buffer)
            .then(_ => this.log.warn(`saved emergency file: ${fn}`))
            .catch(error => this.log.error(`cant create emergency ${fn}`));
    }
    /**
     * Flushing data
     */
    flushWriters() {
        const tables = Object.entries(this.writers)
            .filter(e => !!e[1])
            .map(e => e[0]).sort();
        for (const [i, table] of tables.entries()) {
            setTimeout(() => {
                const writer = this.writers[table];
                this.writers[table] = undefined;
                writer.close()
                    .then((dust) => {
                    this.log.debug(`uploding ${table} batch id:${dust.time}`);
                    this.handleBuffer(dust);
                })
                    .catch((error) => {
                    this.log.error('CH write error', error);
                });
            }, Math.round(this.options.uploadInterval / tables.length) * i);
        }
    }
    /**
     * Uploading each-line-json to ClickHouse
     */
    handleBuffer(dust) {
        // Skip if no data
        const requestTime = this.meter.timenote('ch.upload');
        const queryUrl = this.url + '/?' + qs.stringify(Object.assign({}, this.params, { query: `INSERT INTO ${dust.table} FORMAT JSONEachRow` }));
        (async () => {
            let res;
            try {
                res = await node_fetch_1.default(queryUrl, {
                    method: 'POST',
                    body: dust.buffer,
                    timeout: this.timeout
                });
                if (!res.ok) {
                    const body = await res.text();
                    throw new Error(`body: ${body}`);
                }
                this.meter.tick('ch.upload.ok');
                requestTime();
            }
            catch (error) {
                requestTime();
                this.meter.tick('ch.upload.error');
                this.log.error(`CH write error: ${error.message}`, error, res);
                this.exceptWrite(dust);
            }
        })();
    }
    /**
     * Remove uploaded file
     * @param filename
     */
    unlinkFile(fileName) {
        return unlinkAsync(fileName)
            .then(() => {
            this.log.debug('file unlinked');
        });
    }
}
exports.CHClient = CHClient;
//# sourceMappingURL=CHClient.js.map