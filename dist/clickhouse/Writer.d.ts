import { Deps } from "@app/AppServer";
import { Logger, Meter } from "rock-me-ts";
import { CHConfig } from "@app/types";
import { CHClient } from "./CHClient";
import { CHSync } from "./CHSync";
/**
 * Main writer class. Runs other nessesary components
 */
export declare class CHWriter {
    formatter: (table: string, record: {
        [k: string]: any;
    }) => any;
    log: Logger;
    meter: Meter;
    options: CHConfig;
    initialized: boolean;
    chc: CHClient;
    chs: CHSync;
    copyProps: string[];
    dest: CHConfig['destination'];
    /**
     *
     * @param deps DI
     */
    constructor(deps: Deps);
    /**
     * Prepare database structure and
     * init dependend componenets
     */
    init(): Promise<void>;
    /**
     * Main writer
     */
    write: (msg: {
        [k: string]: any;
    }) => void;
}
