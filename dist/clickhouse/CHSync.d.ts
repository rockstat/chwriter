import { DefaultDict } from '@app/struct/DefaultDict';
import { CHConfig } from '@app/types';
import { Deps } from '@app/AppServer';
import { Logger } from '@rockstat/rock-me-ts';
import { CHClient } from './CHClient';
/**
 * DB syncronisations system
 */
export declare class CHSync {
    log: Logger;
    client: CHClient;
    options: CHConfig;
    tablesCols: DefaultDict<{
        [k: string]: string;
    }>;
    tablesNested: DefaultDict<Set<string>>;
    constructor(options: CHConfig, client: CHClient, { log }: Deps);
    discover(): Promise<void>;
    /**
     * Run syncronization procedure
     */
    sync(): Promise<void>;
    tableConfig(table: string): {
        cols: {
            [k: string]: string;
        };
        nested: Set<string>;
    };
}
