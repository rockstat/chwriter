import 'reflect-metadata';
import { LogFactory, Logger } from '@app/log';
import { IdService, Configurer, RPCAdapterRedis, RPCAgnostic } from '@app/lib';

import { StatsDMetrics } from '@app/lib/metrics/statsd';
import { RPCRegisterStruct, RPCConfig } from '@app/types';
import { SERVICE_BAND, METHOD_IAMALIVE, SERVICE_KERNEL, METHOD_STATUS } from '@app/constants';

import { format as dateFormat } from 'cctz';
import { CHClient } from '@app/lib/clickhouse/CHClient';
import { CHSync } from '@app/lib/clickhouse/CHSync';

export interface Deps {
  logger: LogFactory,
  id: IdService,
  config: Configurer;
}


export class AppServer {

  logger: LogFactory;
  log: Logger;
  deps: Deps;

  rpcConfig: RPCConfig;
  rpc: RPCAgnostic;
  rpcRedis: RPCAdapterRedis;

  appStarted: Date = new Date();

  chc: CHClient;
  chs: CHSync;

  constructor() {
    const config = new Configurer();
    const logger = new LogFactory(config);
    this.deps = {
      id: new IdService(),
      logger,
      config
    }

    this.log = logger.for(this);
    this.log.info('Starting service');

    this.rpcConfig = config.get('rpc');
    this.rpc = new RPCAgnostic(this.deps);
    this.rpcRedis = new RPCAdapterRedis(this.deps);

    this.chc = new CHClient(this.deps);
    this.chs = new CHSync(config.get('clickhouse'), this.chc, this.deps);
    // setTimeout(() => { this.chc.query('SELECT 1').then(res => this.log.info(res)) } , 2000);
    this.setup().then();
  }

  async setup() {
    this.rpcRedis.setReceiver(this.rpc, 'dispatch');
    this.rpc.setup(this.rpcRedis);

    await this.chs.sync();

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
    // await this.rpc.notify('any', 'listener', msg);
  }

  // rpcGateway = async (key: string, msg: IncMsg): Promise<FlexOutgoingMessage> => {
  //   if (msg.service && msg.name && this.rpcHandlers[key]) {
  //     return await this.rpc.request<any>(msg.service, msg.name, msg)
  //   }
  //   return this.defaultHandler(key, msg);
  // }

  rpcHandlers: { [k: string]: [string, string] } = {};

  private onStop() {
    this.log.info('Stopping...');
  }

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
