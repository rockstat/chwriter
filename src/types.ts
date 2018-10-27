import { RPCConfig, StatsDUDPConfig, LoggerConfig, RedisConfig, MeterConfig } from "@rockstat/rock-me-ts";

// CH Configuration

export interface CHTableOptions { 
  engine?: string;
  extend?: string;
  abstract?: boolean;
};
export type CHTableCols = { [key: string]: any };

export type CHTableDefinition = {
  _options: CHTableOptions;
} & CHTableCols;

export type CHTablesConfig = { [key: string]: CHTableDefinition };

export type CHConfig = {
  dsn: string;
  copy_props: Array<string>;
  uploadInterval: number; // seconds
  sync: boolean;
  destinations: { [key: string]: any };// incoming data distribotion among tables, using internal routing key
  base: CHTableCols; // common fields for all tables
  tables: CHTablesConfig; // tables definition
  emergency_dir: string;
};


// CH buffer

export interface CHBufferWriterOpts {
  table: string;
}

export interface CHBufferDust {
  table: string;
  buffer: Buffer;
  fileName?: string;
  time: number;
}

// CH writers

export type CHWritersDict = {
  [k: string]: any
};

export interface CHQueryParams {
  user?: string;
  password?: string;
  database: string;
  query?: string;
}

// ##### CH DATA #####
export type HandyCHRecord = {
  [k: string]: any;
};

// ##### CONFIG ROOT #####
export type ModuleConfig = {
  name: string;
  clickhouse: CHConfig;
}
