import 'reflect-metadata';
import {
  LogFactory,
  Logger
} from '@app/log';
import {
  IdService,
  Configurer,
  RPCAdapterRedis,
  RPCAgnostic
} from '@app/lib';
import { StatsDMetrics } from '@app/lib/metrics/statsd';
import {
  RPCRegisterStruct,
  RPCConfig
} from '@app/types';
import {
  SERVICE_BAND,
  METHOD_IAMALIVE,
  SERVICE_KERNEL,
  METHOD_STATUS,
  BROADCAST
} from '@app/constants';
import { format as dateFormat } from 'cctz';
import { CHClient } from '@app/lib/clickhouse/CHClient';
import { CHSync } from '@app/lib/clickhouse/CHSync';
import { CHWriter } from '@app/lib/clickhouse/Writer';

/**
 * Dependency container
 */
export class Deps {
  logger: LogFactory;
  id: IdService;
  config: Configurer;
  stat: StatsDMetrics;
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
  rpcConfig: RPCConfig;
  rpc: RPCAgnostic;
  rpcRedis: RPCAdapterRedis;
  appStarted: Date = new Date();
  chw: CHWriter;

  constructor() {
    const config = new Configurer();
    const logger = new LogFactory(config);
    this.deps = new Deps({
      id: new IdService(),
      logger,
      config,
    });
    this.deps.stat = new StatsDMetrics(this.deps);
    this.log = logger.for(this);
    this.log.info('Starting service');
    this.rpcConfig = config.get('rpc');
    this.rpc = new RPCAgnostic(this.deps);
    this.rpcRedis = new RPCAdapterRedis(this.deps);
    this.chw = new CHWriter(this.deps)
    this.setup().then();
  }

  /**
   * Required remote functuins
   */
  async setup() {
    await this.chw.init();
    this.rpc.setup(this.rpcRedis);
    this.rpcRedis.setReceiver(this.rpc, 'dispatch');
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
      this.rpc.notify(SERVICE_BAND, METHOD_IAMALIVE, { name: this.rpcConfig.name })
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
