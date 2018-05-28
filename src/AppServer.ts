import 'reflect-metadata';
import { format as dateFormat } from 'cctz';
import {
  RPCAdapterRedis,
  RPCAgnostic,
  AgnosticRPCOptions,
  Meter,
  RedisFactory,
  TheIds,
  Logger,
  AppConfig
} from 'rock-me-ts';

import {
  ModuleConfig
} from '@app/types';
import {
  CHWriter
} from '@app/clickhouse';

import {
  SERVICE_BAND,
  METHOD_IAMALIVE,
  SERVICE_KERNEL,
  METHOD_STATUS,
  BROADCAST
} from '@app/constants';

/**
 * Dependency container
 */
export class Deps {
  log: Logger;
  id: TheIds;
  config: AppConfig<ModuleConfig>;
  meter: Meter;
  constructor(obj: { [k: string]: any } = {}) {
    Object.assign(this, obj);
  }
}

/**
 * Main application. Contains main logic
 */
export class AppServer {
  log: Logger;
  deps: Deps;
  name: string;
  rpcAdaptor: RPCAdapterRedis;
  rpc: RPCAgnostic;
  rpcRedis: RPCAdapterRedis;
  appStarted: Date = new Date();
  chw: CHWriter;

  constructor() {

    const config = new AppConfig<ModuleConfig>();
    const log = new Logger(config.log);
    const meter = new Meter(config.meter);
    this.name = config.rpc.name;
    this.deps = new Deps({
      id: new TheIds(),
      log,
      config,
      meter
    });
    this.log = log.for(this);
    this.log.info('Starting service');

    // setup Redis
    const redisFactory = new RedisFactory({ log, meter, ...config.redis });
    // Setup RPC
    const channels = [config.rpc.name, BROADCAST];
    const rpcOptions: AgnosticRPCOptions = { channels, redisFactory, log, meter, ...config.rpc }
    this.rpcAdaptor = new RPCAdapterRedis(rpcOptions);
    this.rpc = new RPCAgnostic(rpcOptions);
    this.chw = new CHWriter(this.deps)
    this.setup().then();
  }

  /**
   * Required remote functuins
   */
  async setup() {
    await this.chw.init();
    this.rpc.setup(this.rpcAdaptor);
    this.rpc.register(BROADCAST, this.chw.write);
    this.rpc.register(METHOD_STATUS, async () => {
      const appUptime = Number(new Date()) - Number(this.appStarted);
      return {
        status: "running",
        app_started: Number(this.appStarted),
        app_uptime: appUptime,
        app_uptime_h: dateFormat('%X', Math.round(appUptime / 1000)),
        methods: []
      };
    });
    const aliver = () => {
      this.rpc.notify(SERVICE_BAND, METHOD_IAMALIVE, { name: this.name })
    };
    setTimeout(aliver, 500);
    setInterval(aliver, 60000);
  }

  /**
   * Graceful stot
   */
  private onStop() {
    this.log.info('Stopping...');
  }

  /**
   * Sinals listening
   */
  private attachSignals() {
    // Handles normal process termination.
    process.on('exit', () => this.onStop());
    // Handles `Ctrl+C`.
    process.on('SIGINT', () => process.exit(0));
    // Handles `kill pid`.
    process.on('SIGTERM', () => process.exit(0));
  }
}

export const appServer = new AppServer();
