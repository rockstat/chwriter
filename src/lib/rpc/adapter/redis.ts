import { RedisClient } from "@app/lib/redis";
import { handleSetup } from "@app/helpers/class";
import { Logger, LogFactory } from "@app/log";
import { Configurer } from "@app/lib";
import { RPCConfig } from "@app/types";

import { RPCAdapter } from './abstract'
import { Deps } from "@app/AppServer";
import { BROADCAST } from "@app/constants";

type MsgReceiver = (data: any) => void;
type ReceiverObject = {
  dispatch: MsgReceiver
}

export class RPCAdapterRedis implements RPCAdapter {

  rsub: RedisClient;
  rpub: RedisClient;

  config: RPCConfig;

  log: Logger;
  started: boolean;

  receiver: MsgReceiver = (data) => {
    throw new Error('Adapter not attached');
  };

  constructor(deps: Deps) {
    const { logger, config } = deps;
    this.config = config.get('rpc');

    const {
      name,
      listen_direct,
      listen_all
    } = this.config;

    this.log = logger.for(this);
    this.rsub = new RedisClient(deps);

    this.rsub.on('connect', () => {
      if (listen_direct) {
        this.rsub.subscribe(name, this.redisMsg);
      }
      if (listen_all) {
        this.rsub.subscribe(BROADCAST, this.redisMsg);
      }
    })

    this.rpub = new RedisClient(deps)
    this.log.info('started');
  }

  setReceiver<K extends keyof ReceiverObject>(obj: ReceiverObject, fname: K): void {
    this.receiver = obj[fname];
  }

  private decode(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch (error) {
      this.log.error('Redis decode payload error', error);
      return;
    }
  }

  private encode(data: any): string | void {
    try {
      return JSON.stringify(data);
    } catch (error) {
      this.log.error('Redis encode payload error', error);
      return;
    }
  }

  send(to: string, msg: any): void {
    const raw = this.encode(msg);
    this.log.debug('\n <---', raw)
    this.rpub.publish(to, raw);
  }

  redisMsg = (redismsg: Array<string>) => {

    if (redismsg[0] === 'message' || redismsg[0] === 'pmessage') {

      const raw = redismsg[redismsg.length - 1];

      this.log.debug('\n --> ', raw);
      const msg = this.decode(raw);

      if (msg && msg.jsonrpc === '2.0') {
        this.receiver(msg);
      }

    } else {
      this.log.warn('unhandled cmd', redismsg);
    }
  }


}
