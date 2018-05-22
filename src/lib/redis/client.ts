import * as Redis from 'redis-fast-driver';

import { Configurer } from '@app/lib';
import { Logger, LogFactory } from '@app/log';
import { RedisConfig } from '@app/types';
import { Deps } from '@app/AppServer';

type Handler = (msg: Array<string>) => void;

export class RedisClient {

  configurer: Configurer;
  options: RedisConfig;
  log: Logger;
  client: Redis;
  started: boolean = false;

  constructor(deps: Deps) {
    const {logger, config} = deps;
    this.log = logger.for(this)
    this.options = config.get('redis');
    const {host, port, db} = this.options;

    this.log.info('Starting redis client. Server: %s:%s/%d', host, port, db);
    this.client = new Redis(this.options);

    //happen only once
    this.client.on('ready', () => {
      this.log.info('redis ready');
    });

    //happen each time when reconnected
    this.client.on('connect', () => {
      this.log.info('redis connected');
    });

    this.client.on('disconnect', () => {
      this.log.info('redis disconnected');
    });

    this.client.on('reconnecting', (num: number) => {
      this.log.info('redis reconnecting with attempt #' + num);
    });

    this.client.on('error', (e: Error) => {
      this.log.info('redis error', e);
    });

    // called on an explicit end, or exhausted reconnections
    this.client.on('end', () => {
      this.log.info('redis closed');
    });
  }

  on = (event: string, func: (...args: any[]) => void) => {
    this.client.on(event, func);
  }

  publish(topic: string, raw: any): void {
    this.client.rawCall(['publish', topic, raw], (error: Error, msg: any) => {
      if (error) {
        this.log.error('Redis publish error', error);
      }
    })
  }

  subscribe(channel: string, func: Function): void {
    this.client.rawCall(['subscribe', channel], (error: Error, msg: Array<string>) => {
      if (error) {
        this.log.error('Redis error', error);
        return;
      }
      func(msg);
    })
  }
}
