import 'reflect-metadata';
import { format as dateFormat } from 'cctz';
import {
  RPCAdapterRedis,
  RPCAgnostic,
  AgnosticRPCOptions
} from 'agnostic-rpc';

import {
  LogFactory,
  Logger
} from '@app/log';
import {
  Configurer,
} from '@app/lib';
import { Meter } from 'meterme';
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
  RedisFactory
} from '@app/lib/redis';
import { TheIds} from 'theids';

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
  logger: LogFactory;
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
  logger: LogFactory;
  log: Logger;
  deps: Deps;
  name: string;
  redisFactory: RedisFactory
  rpcAdaptor: RPCAdapterRedis;
  rpc: RPCAgnostic;
  rpcRedis: RPCAdapterRedis;
  appStarted: Date = new Date();
  chw: CHWriter;

  constructor() {

    const config = new Configurer();
    const logger = new LogFactory(config);
    const meter = new Meter(config.meter);
    this.name = config.rpc.name;
    this.deps = new Deps({
      id: new TheIds(),
      logger,
      config,
      meter
    });
    this.log = logger.for(this);
    this.log.info('Starting service');
    // setup RPC
    const redisFactory = new RedisFactory(this.deps);
    const channels = [config.rpc.name, BROADCAST];
    const rpcOptions: AgnosticRPCOptions = Object.assign({
      channels,
      redisFactory,
      logger: logger.child({ name: 'redis' }),
      meter
    }, config.rpc);
    this.rpcAdaptor = new RPCAdapterRedis(rpcOptions);
    this.rpc = new RPCAgnostic(rpcOptions);

    // this.rpcConfig = config.get('rpc');
    //
    // this.rpcRedis = new RPCAdapterRedis(this.deps);

    this.chw = new CHWriter(this.deps)
    this.setup().then();
  }

  /**
   * Required remote functuins
   */
  async setup() {
    await this.chw.init();
    this.rpc.setup(this.rpcAdaptor);
    // this.rpcRedis.setReceiver(this.rpc, 'dispatch');
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
