import * as pino from 'pino';
import { PinoConfig, LoggerConfig } from '../types';
import { Configurer } from '../lib/AppConfig';
import { LogPino } from './LogPino';

export interface ChildLogOptions {
  name: string;
}

export interface LogFn {
  (msg: string, ...args: any[]): void;
  (obj: object, msg?: string, ...args: any[]): void;
}

export type Logger = LoggerMethods & LogLevels;
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
export type LogLevels = { [key in LogLevel]: LogFn }

export interface LoggerMethods {
  logger: any;
  child(options: ChildLogOptions): Logger;
}


export class LogFactory {

  logger: LogPino;

  constructor(configurer: Configurer) {
    this.logger = new LogPino(configurer.log);
  }

  child(options: object): Logger {
    return this.logger.child(options);
  }

  for(object: object): Logger {
    const options = {
      name: object.constructor.name
    };
    return this.child(options);
  }
}
