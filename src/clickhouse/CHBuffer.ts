import { CHBufferWriterOpts, CHBufferDust } from '../types';

/**
 * Custom JSON filter for ClickHouse adaptation
 */
function replacer(k: string, v: any): boolean {
  return typeof v === 'boolean' ? Number(v) : v
}

export class CHBuffer {
  time: number = Number(new Date());
  options: CHBufferWriterOpts;
  table: string;
  buffers: Array<Buffer>

  /**
   * Just constructor, nothing specoal
   * @param param0
   * @param param1
   */
  constructor({ table }: CHBufferWriterOpts) {
    this.table = table;
    this.buffers = [];
  }

  /**
   * Encode record an push record to writing buffer
   */
  push(object: {}) {
    const chunk = new Buffer(JSON.stringify(object, replacer) + '\n');
    this.buffers.push(chunk);
  }

  /**
   * Init closing procedure before uploading to ClickHouse
   */
  async close(): Promise<CHBufferDust> {
    return {
      buffer: Buffer.concat(this.buffers),
      table: this.table,
      time: this.time
    };
  }
}

