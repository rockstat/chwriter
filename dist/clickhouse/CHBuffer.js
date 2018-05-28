"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Custom JSON filter for ClickHouse adaptation
 */
function replacer(k, v) {
    return typeof v === 'boolean' ? Number(v) : v;
}
class CHBuffer {
    /**
     * Just constructor, nothing specoal
     * @param param0
     * @param param1
     */
    constructor({ table }) {
        this.time = Number(new Date());
        this.table = table;
        this.buffers = [];
    }
    /**
     * Encode record an push record to writing buffer
     */
    push(object) {
        const chunk = new Buffer(JSON.stringify(object, replacer) + '\n');
        this.buffers.push(chunk);
    }
    /**
     * Init closing procedure before uploading to ClickHouse
     */
    async close() {
        return {
            buffer: Buffer.concat(this.buffers),
            table: this.table,
            time: this.time
        };
    }
}
exports.CHBuffer = CHBuffer;
//# sourceMappingURL=CHBuffer.js.map