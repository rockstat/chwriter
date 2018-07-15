import * as Bluebird from 'bluebird';
import { Deps } from '@app/AppServer';
import { Logger, MeterFacade } from 'rock-me-ts';
import { CHConfig } from '@app/types';
import { CHBufferDust, CHQueryParams, CHWritersDict } from '../types';
import { CHBuffer } from './CHBuffer';
/**
 * Base ClickHouse lib.
 * Used for raw data queries and modifications
 * Also provide object-push style writing
 * @property {ServiceStat} stat Internal stat service
 */
export declare class CHClient {
    log: Logger;
    url: string;
    db: string;
    options: CHConfig;
    params: CHQueryParams;
    writers: CHWritersDict;
    timeout: number;
    emergency_dir: string;
    meter: MeterFacade;
    constructor(deps: Deps);
    /**
     *
     * @param table table name
     */
    getWriter(table: string): CHBuffer;
    /**
     * Setup upload interval
     */
    init(): void;
    /**
     * Execution data modification query
     * @param query
     */
    execute(body: string): Promise<string | undefined>;
    /**
     * Executes query and return resul
     * @param query
     */
    query(query: string): Promise<string | undefined>;
    /**
     * Executes query and return stream
     * @param query
     */
    querySream(query: string): void;
    /**
     * Read tables structure from database
     */
    tablesColumns(): Promise<Array<{
        table: string;
        name: string;
        type: string;
    }>>;
    /**
     * Emergincy write in file
     */
    exceptWrite(dust: CHBufferDust): void;
    /**
     * Flushing data
     */
    flushWriters(): void;
    /**
     * Uploading each-line-json to ClickHouse
     */
    handleBuffer(dust: CHBufferDust): void;
    /**
     * Remove uploaded file
     * @param filename
     */
    unlinkFile(fileName: string): Bluebird<void>;
}
