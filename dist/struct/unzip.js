"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Function implements zip algorithm with filtration
 */
function unzip(obj, keyFilter, valFilter) {
    const key = [];
    const value = [];
    if (obj) {
        for (let [k, v] of Object.entries(obj)) {
            if (keyFilter) {
                k = keyFilter(k);
            }
            if (valFilter) {
                v = valFilter(v);
            }
            key.push(k);
            value.push(v);
        }
    }
    return { key, value };
}
exports.unzip = unzip;
;
//# sourceMappingURL=unzip.js.map