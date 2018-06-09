import 'reflect-metadata';
import { RPCAgnostic, Meter, RedisFactory, TheIds, Logger, AppConfig, RPCAdapter } from 'rock-me-ts';
import { ModuleConfig } from '@app/types';
import { CHWriter } from '@app/clickhouse';
/**
 * Dependency container
 */
export declare class Deps {
    log: Logger;
    id: TheIds;
    config: AppConfig<ModuleConfig>;
    meter: Meter;
    rpc: RPCAgnostic;
    rpcAdaptor: RPCAdapter;
    redisFactory: RedisFactory;
    constructor(obj?: {
        [k: string]: any;
    });
}
/**
 * Main application. Contains main logic
 */
export declare class AppServer {
    log: Logger;
    deps: Deps;
    name: string;
    rpcAdaptor: RPCAdapter;
    rpc: RPCAgnostic;
    appStarted: Date;
    chw: CHWriter;
    constructor();
    /**
     * Required remote functuins
     */
    setup(): Promise<void>;
    /**
     * Graceful stot
     */
    private onStop;
    /**
     * Sinals listening
     */
    private attachSignals;
}
export declare const appServer: AppServer;
