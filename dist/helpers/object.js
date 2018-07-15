"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function pick(obj, paths) {
    return Object.assign({}, ...paths.map(prop => ({ [prop]: obj[prop] })));
}
exports.pick = pick;
/**
 * Check is Object
 */
exports.isObject = (o) => {
    return (!!o && typeof o === 'object' && Object.prototype.toString.call(o) === '[object Object]');
};
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
//# sourceMappingURL=object.js.map