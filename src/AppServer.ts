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
  AppConfig,
  RPCAdapter,
  AppStatus,
  MeterFacade
} from 'rock-me-ts';

import {
  ModuleConfig
} from '@app/types';
import {
  CHWriter
} from '@app/clickhouse';

import {
  SERVICE_DIRECTOR,
  METHOD_IAMALIVE,
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
  rpc: RPCAgnostic;
  rpcAdaptor: RPCAdapter;
  redisFactory: RedisFactory;
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
  status: AppStatus;
  name: string;
  rpcAdaptor: RPCAdapter;
  rpc: RPCAgnostic;
  appStarted: Date = new Date();
  chw: CHWriter;
  meter: MeterFacade

  constructor() {

    const config = new AppConfig<ModuleConfig>();
    const log = new Logger(config.log);
    const meter = new Meter(config.meter);
    this.meter = meter;
    this.status = new AppStatus();
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
    const redisFactory = this.deps.redisFactory = new RedisFactory({ log, meter, ...config.redis });
    // Setup RPC
    const channels = [config.rpc.name, BROADCAST];
    const rpcOptions: AgnosticRPCOptions = { channels, redisFactory, log, meter, ...config.rpc }
    this.rpcAdaptor = this.deps.rpcAdaptor = new RPCAdapterRedis(rpcOptions);
    this.rpc = this.deps.rpc = new RPCAgnostic(rpcOptions);
    this.rpc.setup(this.rpcAdaptor);
    this.chw = new CHWriter(this.deps);
    this.setup().then((() => {
      this.log.info('Setup completed');
    }));
  }

  /**
   * Required remote functuins
   */
  async setup() {
    await this.chw.init();
    this.rpc.register(BROADCAST, this.chw.write);
    this.rpc.register(METHOD_STATUS, this.status.get);
    const aliver = () => {
      this.meter.tick('band.chwriter.alive')
      this.rpc.notify(SERVICE_DIRECTOR, METHOD_IAMALIVE, { name: this.name })
    };
    setTimeout(aliver, 500);
    setInterval(aliver, 5*1000);
  }

  /**
   * Graceful stot
   */
  private onStop() {
    this.log.info('Stopping...');
    process.exit(0)
  }

  /**
   * Sinals listening
   */
  private attachSignals() {
    // Handles normal process termination.
    process.on('exit', () => this.onStop());
    // Handles `Ctrl+C`.
    process.on('SIGINT', () => this.onStop());
    // Handles `kill pid`.
    process.on('SIGTERM', () => this.onStop());
  }
}

export const appServer = new AppServer();
