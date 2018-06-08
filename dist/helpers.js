"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function pick(obj, paths) {
    return Object.assign({}, ...paths.map(prop => ({ [prop]: obj[prop] })));
}
exports.pick = pick;
//# sourceMappingURL=helpers.js.map