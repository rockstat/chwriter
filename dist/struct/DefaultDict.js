"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Simple DefaultDict Implementation
 */
function defaultDict(type) {
    const dict = {};
    return {
        get: (key) => {
            if (!dict[key]) {
                dict[key] = new type();
            }
            return dict[key];
        },
        set: (key, val) => dict[key] = val,
        has: (key) => dict.hasOwnProperty(key),
        keys: () => Object.keys(dict),
        values: () => Object.values(dict),
        entries: () => Object.entries(dict),
        dict: dict
    };
}
exports.defaultDict = defaultDict;
//# sourceMappingURL=DefaultDict.js.map