/// <reference types="node" />
export declare type CHTableOptionsKeys = "engine" | "extend";
export declare type CHTableOptions = {
    [key in CHTableOptionsKeys]: string;
};
export declare type CHTableCols = {
    [key: string]: any;
};
export declare type CHTableDefinition = {
    _options: CHTableOptions;
} & CHTableCols;
export declare type CHTablesConfig = {
    [key: string]: CHTableDefinition;
};
export declare type CHConfig = {
    dsn: string;
    uploadInterval: number;
    sync: boolean;
    destination: {
        [key: string]: any;
    };
    base: CHTableCols;
    tables: CHTablesConfig;
    emergency_dir: string;
};
export interface CHBufferWriterOpts {
    table: string;
}
export interface CHBufferDust {
    table: string;
    buffer: Buffer;
    fileName?: string;
    time: number;
}
export declare type CHWritersDict = {
    [k: string]: any;
};
export interface CHQueryParams {
    user?: string;
    password?: string;
    database: string;
    query?: string;
}
export declare type ModuleConfig = {
    name: string;
    clickhouse: CHConfig;
};
