/// <reference types="node" />
import { CHBufferWriterOpts, CHBufferDust } from '../types';
export declare class CHBuffer {
    time: number;
    options: CHBufferWriterOpts;
    table: string;
    buffers: Array<Buffer>;
    /**
     * Just constructor, nothing specoal
     * @param param0
     * @param param1
     */
    constructor({table}: CHBufferWriterOpts);
    /**
     * Encode record an push record to writing buffer
     */
    push(object: {}): void;
    /**
     * Init closing procedure before uploading to ClickHouse
     */
    close(): Promise<CHBufferDust>;
}
