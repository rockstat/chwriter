"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
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
        this.meter = meter;
        this.status = new rock_me_ts_1.AppStatus();
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
        const redisFactory = this.deps.redisFactory = new rock_me_ts_1.RedisFactory({ log, meter, ...config.redis });
        // Setup RPC
        const channels = [config.rpc.name, constants_1.BROADCAST];
        const rpcOptions = { channels, redisFactory, log, meter, ...config.rpc };
        this.rpcAdaptor = this.deps.rpcAdaptor = new rock_me_ts_1.RPCAdapterRedis(rpcOptions);
        this.rpc = this.deps.rpc = new rock_me_ts_1.RPCAgnostic(rpcOptions);
        this.rpc.setup(this.rpcAdaptor);
        this.chw = new clickhouse_1.CHWriter(this.deps);
        this.setup().then((() => {
            this.log.info('Setup completed');
        }));
    }
    /**
     * Required remote functuins
     */
    async setup() {
        await this.chw.init();
        this.rpc.register(constants_1.BROADCAST, this.chw.write);
        this.rpc.register(constants_1.METHOD_STATUS, this.status.get);
        const aliver = () => {
            this.meter.tick('band.chwriter.alive');
            this.rpc.notify(constants_1.SERVICE_DIRECTOR, constants_1.METHOD_IAMALIVE, { name: this.name });
        };
        setTimeout(aliver, 500);
        setInterval(aliver, 5 * 1000);
    }
    /**
     * Graceful stot
     */
    onStop() {
        this.log.info('Stopping...');
        process.exit(0);
    }
    /**
     * Sinals listening
     */
    attachSignals() {
        // Handles normal process termination.
        process.on('exit', () => this.onStop());
        // Handles `Ctrl+C`.
        process.on('SIGINT', () => this.onStop());
        // Handles `kill pid`.
        process.on('SIGTERM', () => this.onStop());
    }
}
exports.AppServer = AppServer;
exports.appServer = new AppServer();
//# sourceMappingURL=AppServer.js.map