import * as Redis from "redis-fast-driver";


export type Envs = 'dev' | 'prod' | 'stage';
export type MappedType<T> = { [K in keyof T]: T[K] };

export type Dictionary<T> = Partial<{ [key: string]: T }>;
export type QueryParams = { [k: string]: string }



// RPC

interface RPCRegisterStruct {
  methods?: Array<[string, string, string]>
}


interface RPCRegisterHandler {
  (params: RPCRegisterStruct): any
}

export interface RPCBase {
  jsonrpc: '2.0';
  to: string;
  from: string;
}

export type RPCRequestParams = { [k: string]: any } | null;

export interface RPCRequest extends RPCBase {
  id?: string;
  method: string;
  params: RPCRequestParams;
}

export interface RPCResponse extends RPCBase {
  id: string;
  result: any;
}

interface RPCErrorDetails {
  message: string;
  code: number;
  data?: any;
}

export interface RPCResponseError extends RPCBase {
  id: string;
  error: RPCErrorDetails;
}



// ##### LOGS #####


interface Dispatcher {
  registerHandler: () => void
  subscribe: () => void
  registerEnricher: () => void

}

export interface EnrichService {
  enrich: (key: string, msg: { [key: string]: any }) => Promise<string | undefined> | undefined;
}


export type RemoteServices = { [key: string]: RemoteService };
export type RemoteService = EnrichService & {
  register: (dispatcher: Dispatcher) => void
}

export type Headers = Array<[string, string | string[]]>;




// ##### LOGS #####

export interface PinoConfig {
  name?: string;
  safe?: boolean;
  level?: string;
  prettyPrint?: boolean;
}

type Loggers = 'pino'
export interface LoggerConfig {
  use: Loggers;
  pino: PinoConfig;
}

// ##### METRICS #####

export interface StatsDClientConfig {
  prefix?: string;
  tcp?: boolean;
  socketTimeout?: number;
  tags?: { [k: string]: string | number }
}

export interface StatsDUDPConfig extends StatsDClientConfig {
  tcp?: false;
  host: string;
  port: number;
  ipv6?: boolean;
}


// ##### CLICKHOUSE #####

type WriterCHTableOptsType = "engine" | "extend";
type WriterCHTableCols = { [key: string]: any };
type WriterCHTableOpts = { [key in WriterCHTableOptsType]: string };

export type WriterCHTableDefinition = WriterCHTableCols & {
  _options: WriterCHTableOpts;
};

export type WriterCHTables = { [key: string]: WriterCHTableDefinition };

export type WriterClickHouseConfig = {
  dsn: string;
  uploadInterval: number; // seconds
  sync: boolean;
  distribution: { [key: string]: any };// incoming data distribotion among tables, using internal routing key
  base: WriterCHTableCols; // common fields for all tables
  tables: WriterCHTables; // tables definition
};

// ##### REDIS #####

export interface RedisConfig {
  host: string;
  port: number;
  db: number;
  auth: boolean;
  maxRetries: number;
  tryToReconnect: boolean;
  reconnectTimeout: number;
  autoConnect: boolean;
  doNotSetClientName: boolean;
  doNotRunQuitOnEnd: boolean;
}

// ##### RPC #####
export interface RPCConfig {
  name: string;
  listen_all: boolean;
  listen_direct: boolean;
}

// ##### CONFIG ROOT #####

export type Config = {
  name: string;
  env: Envs;
  clickhouse: WriterClickHouseConfig;
  redis: RedisConfig;
  log: LoggerConfig;
  metrics: {
    statsd?: StatsDUDPConfig;
  };
  rpc: RPCConfig;
}

export type ConfigSection = {}
