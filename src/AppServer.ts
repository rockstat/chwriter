import 'reflect-metadata';
import { LogFactory, Logger } from '@app/log';
import { IdService, Configurer, RPCAdapterRedis, RPCAgnostic } from '@app/lib';

import { StatsDMetrics } from '@app/lib/metrics/statsd';
import { RPCRegisterStruct, RPCConfig } from '@app/types';
import { SERVICE_BAND, CALL_IAMALIVE, SERVICE_KERNEL } from '@app/constants';

export interface Deps {
  logger: LogFactory,
  id: IdService,
  config: Configurer;
}


export class AppServer {

  logger: LogFactory;
  log: Logger;
  private _deps: Deps;

  rpcConfig: RPCConfig;
  rpcRedis: RPCAdapterRedis;
  rpc: RPCAgnostic;

  constructor() {

    this._deps = {
      logger: new LogFactory(this.deps.config),
      id: new IdService(),
      config: new Configurer(),
    }

    this.rpcConfig = this.deps.config.get('rpc');
    this.rpcRedis = new RPCAdapterRedis()

    this.log = this.deps.logger.for(this);
    this.log.info('Starting Handler service');
  }

  setup() {
    this.rpcRedis.setup(this.rpcConfig);
    this.rpcRedis.setReceiver(this.rpc, 'dispatch');
    this.rpc.setup(this.rpcRedis);

    this.rpc.register('status', async () => {
      return { 'status': "i'm ok!" };
    });

    this.rpc.register<RPCRegisterStruct>('services', async (data: { [k: string]: string }) => {
      if (data.methods) {
        const updateHdrs: string[] = [];
        for (const [name, method, role] of data.methods) {

        }

      }
      return { result: true };
    });
    // notify band
    setImmediate(() => {
      this.rpc.notify(SERVICE_BAND, CALL_IAMALIVE, { name: SERVICE_KERNEL })
    })
    // await this.rpc.notify('any', 'listener', msg);
  }

  // rpcGateway = async (key: string, msg: IncMsg): Promise<FlexOutgoingMessage> => {
  //   if (msg.service && msg.name && this.rpcHandlers[key]) {
  //     return await this.rpc.request<any>(msg.service, msg.name, msg)
  //   }
  //   return this.defaultHandler(key, msg);
  // }

  rpcHandlers: { [k: string]: [string, string] } = {};


  get deps() {
    return this._deps;
  }


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
