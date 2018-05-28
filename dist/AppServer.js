"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const cctz_1 = require("cctz");
const rock_me_ts_1 = require("rock-me-ts");
const clickhouse_1 = require("@app/clickhouse");
const constants_1 = require("@app/constants");
/**
 * Dependency container
 */
class Deps {
    constructor(obj = {}) {
        Object.assign(this, obj);
    }
}
exports.Deps = Deps;
/**
 * Main application. Contains main logic
 */
class AppServer {
    constructor() {
        this.appStarted = new Date();
        const config = new rock_me_ts_1.AppConfig();
        const log = new rock_me_ts_1.Logger(config.log);
        const meter = new rock_me_ts_1.Meter(config.meter);
        this.name = config.rpc.name;
        this.deps = new Deps({
            id: new rock_me_ts_1.TheIds(),
            log,
            config,
            meter
        });
        this.log = log.for(this);
        this.log.info('Starting service');
        // setup Redis
        const redisFactory = new rock_me_ts_1.RedisFactory({ log, meter, ...config.redis });
        // Setup RPC
        const channels = [config.rpc.name, constants_1.BROADCAST];
        const rpcOptions = { channels, redisFactory, log, meter, ...config.rpc };
        this.rpcAdaptor = new rock_me_ts_1.RPCAdapterRedis(rpcOptions);
        this.rpc = new rock_me_ts_1.RPCAgnostic(rpcOptions);
        this.chw = new clickhouse_1.CHWriter(this.deps);
        this.setup().then();
    }
    /**
     * Required remote functuins
     */
    async setup() {
        await this.chw.init();
        this.rpc.setup(this.rpcAdaptor);
        this.rpc.register(constants_1.BROADCAST, this.chw.write);
        this.rpc.register(constants_1.METHOD_STATUS, async () => {
            const appUptime = Number(new Date()) - Number(this.appStarted);
            return {
                status: "running",
                app_started: Number(this.appStarted),
                app_uptime: appUptime,
                app_uptime_h: cctz_1.format('%X', Math.round(appUptime / 1000)),
                methods: []
            };
        });
        const aliver = () => {
            this.rpc.notify(constants_1.SERVICE_BAND, constants_1.METHOD_IAMALIVE, { name: this.name });
        };
        setTimeout(aliver, 500);
        setInterval(aliver, 60000);
    }
    /**
     * Graceful stot
     */
    onStop() {
        this.log.info('Stopping...');
    }
    /**
     * Sinals listening
     */
    attachSignals() {
        // Handles normal process termination.
        process.on('exit', () => this.onStop());
        // Handles `Ctrl+C`.
        process.on('SIGINT', () => process.exit(0));
        // Handles `kill pid`.
        process.on('SIGTERM', () => process.exit(0));
    }
}
exports.AppServer = AppServer;
exports.appServer = new AppServer();
//# sourceMappingURL=AppServer.js.map