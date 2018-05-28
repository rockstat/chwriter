
/**
 * Custom JSON filter for ClickHouse adaptation
 */
function replacer(k: string, v: any): boolean {
  return typeof v === 'boolean' ? Number(v) : v
}

export interface BufferWriterOpts {
  table: string;
}

export interface BufferDust {
  table: string;
  buffer: Buffer;
  fileName?: string;
  time: number;
}

export class CHBuffer {
  time: number = Number(new Date());
  options: BufferWriterOpts;
  table: string;
  buffers: Array<Buffer>

  /**
   * Just constructor, nothing specoal
   * @param param0
   * @param param1
   */
  constructor({ table }: BufferWriterOpts) {
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
  async close(): Promise<BufferDust> {
    return {
      buffer: Buffer.concat(this.buffers),
      table: this.table,
      time: this.time
    };
  }
}

