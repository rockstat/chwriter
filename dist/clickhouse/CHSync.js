"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Lazy = require("lazy.js");
const DefaultDict_1 = require("@app/struct/DefaultDict");
/**
 * Make create table SQL query
 * @param name table name
 * @param cols columns dict
 * @param tableOptions table options for clickhouse
 */
const showCreateTable = (name, cols, tableOptions) => {
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
const showAlterTable = (name, cols, table_options) => {
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
const newCols = (schemaCols, currentCols) => {
    schemaCols.filter(col => {
        currentCols.indexOf(col) < 0;
    });
};
/**
 * DB syncronisations system
 */
class CHSync {
    constructor(options, client, { log }) {
        this.log = log.for(this);
        this.client = client;
        this.options = Object.assign({}, options);
    }
    async discover() {
        // Preparing tables dicts
        this.tablesCols = DefaultDict_1.defaultDict(Object);
        this.tablesNested = DefaultDict_1.defaultDict(Set);
        // Reading database structure
        const list = await this.client.tablesColumns();
        // Detecting nested fields
        for (const row of list) {
            const { table, name, type } = row;
            // detecting storage for extra properties
            let [key, sub] = name.split('extra.');
            this.tablesCols.get(table)[name] = type;
            if (sub) {
                key = key.replace(/_$/, '');
                this.log.debug('extra field "%s": "%s"', key, sub);
                this.tablesNested.get(table).add(key);
            }
        }
        this.log.info({
            tables: this.tablesCols.keys().join(', '),
        }, 'Discovered');
        for (const [tname, tcols] of this.tablesCols.entries()) {
            this.log.debug(`table: ${tname}: %s `, Object.keys(tcols));
        }
    }
    /**
     * Run syncronization procedure
     */
    async sync() {
        const { tables, base, sync } = this.options;
        this.log.info('initial discover...');
        await this.discover();
        if (sync !== true) {
            this.log.info('db sync disabled. skipping');
            return;
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
            const schemaCols = Object.assign({}, base, customCols);
            // creating table
            if (!exists) {
                const query = showCreateTable(table, schemaCols, _options);
                this.log.info(`Creating table ${table}: ${query}`);
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
                    const query = showAlterTable(table, Lazy(schemaCols)
                        .pick(appendCols)
                        .toObject(), _options);
                    await this.client.execute(query);
                }
            }
        }
        // rediscover db structure
        await this.discover();
        this.log.info('Schema sync done');
    }
    //take table config
    tableConfig(table) {
        return {
            cols: this.tablesCols.get(table),
            nested: this.tablesNested.get(table)
        };
    }
}
exports.CHSync = CHSync;
//# sourceMappingURL=CHSync.js.map