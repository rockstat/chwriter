import 'reflect-metadata';
import { format as dateFormat } from 'cctz';
import {
  RPCAdapterRedis,
  RPCAgnostic,
  AgnosticRPCOptions,
  Meter,
  RedisFactory,
  TheIds,
  Logger
} from 'rockmets';

import {
  Configurer,
} from '@app/lib';
import {
  RPCRegisterStruct,
  RPCConfig
} from '@app/types';
import {
  CHClient,
  CHSync,
  CHWriter
} from '@app/lib/clickhouse';

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
  config: Configurer;
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

    const config = new Configurer();
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
      const now = new Date();
      const appUptime = Number(now) - Number(this.appStarted);
      return {
        status: "i'm ok!",
        app_started: Number(this.appStarted),
        app_uptime: appUptime,
        app_uptime_h: dateFormat('%X', Math.round(appUptime / 1000)),
        methods: []
      };
    });
    setTimeout(() => {
      this.rpc.notify(SERVICE_BAND, METHOD_IAMALIVE, { name: this.name })
    }, 500)
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
