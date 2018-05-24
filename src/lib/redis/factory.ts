import { RedisClient, Configurer } from "@app/lib";
import { RedisConfig } from "@app/types";
import { Logger, LogFactory } from "@app/log";
import { Deps } from "@app/AppServer";

export interface IRedisFactory {
  create(): RedisClient;
}

export class RedisFactory implements IRedisFactory {
  config: Configurer;
  logger: LogFactory;
  log: Logger;

  constructor({logger, config}:Deps) {
    this.logger = logger;
    this.config = config;
    this.log = logger.for(this);
  }

  create(): RedisClient {
    return new RedisClient(this.config.redis, this.log);
  }
}
