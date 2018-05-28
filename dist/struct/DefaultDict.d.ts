export declare type DefaultDict<T> = {
    get: (key: string) => T;
    set: (key: string, val: T) => void;
    has: (key: string) => boolean;
    keys: () => Array<string>;
    entries: () => Array<[string, T]>;
    dict: {
        [k: string]: T;
    };
};
/**
 * Simple DefaultDict Implementation
 */
export declare function defaultDict<T>(type: new () => T): DefaultDict<T>;
