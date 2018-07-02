declare type StructChild = {
    [k: string]: any;
};
/**
 * Funtion to transform nested json structure to
 * flat database-like considering locatins rules
 * @param child {Object}
 * @param nested {Set}
 * @param cols {Object}
 * @param path {Array<string>}
 * @param separator {string}
 * @param noCheck {boolean}
 * @return {Object}
 */
export declare const flatObject: (child: StructChild, nested: Set<string> | null, cols: StructChild, path?: string[], separator?: string, noCheck?: boolean) => StructChild;
export {};
