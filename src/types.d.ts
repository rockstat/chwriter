import {RPCConfig, StatsDUDPConfig, LoggerConfig, RedisConfig, MeterConfig} from "rockmets";

export type MappedType<T> = { [K in keyof T]: T[K] };
export type Dictionary<T> = Partial<{ [key: string]: T }>;
export type QueryParams = { [k: string]: string }



// ##### CLICKHOUSE #####

type WriterCHTableOptsType = "engine" | "extend";
type WriterCHTableCols = { [key: string]: any };
type WriterCHTableOpts = { [key in WriterCHTableOptsType]: string };

export type WriterCHTableDefinition = WriterCHTableCols & {
  _options: WriterCHTableOpts;
};

export type WriterCHTables = { [key: string]: WriterCHTableDefinition };

export type ClickHouseConfig = {
  dsn: string;
  uploadInterval: number; // seconds
  sync: boolean;
  locations: { [key: string]: any };// incoming data distribotion among tables, using internal routing key
  base: WriterCHTableCols; // common fields for all tables
  tables: WriterCHTables; // tables definition
  emergency_dir: string;
};

// ##### CONFIG ROOT #####

export type ModuleConfig = {
  name: string;
  clickhouse: ClickHouseConfig;
}
