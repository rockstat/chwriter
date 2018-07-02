export declare function pick<T, K extends keyof T>(obj: T, paths: K[]): Pick<T, K>;
/**
 * Check is Object
 */
export declare const isObject: (o: any) => boolean;
export declare type ZipFilter<T> = (x: any) => T;
export declare type ZipObject<V> = {
    [k: string]: V;
};
/**
 * Function implements zip algorithm with filtration
 */
export declare function unzip<V>(obj: ZipObject<V>, keyFilter: ZipFilter<string>, valFilter: ZipFilter<V>): {
    key: string[];
    value: V[];
};
