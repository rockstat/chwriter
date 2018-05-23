import { Deps } from "@app/AppServer";
import { Logger } from "@app/log";

function boolToInt(k: string, v: any): boolean {
  return typeof v === 'boolean' ? Number(v) : v
}

export interface BufferWriterOpts {
  table: string;
}

export interface BufferDust {
  table: string;
  buffer: Buffer;
  fileName?: string;
}

export class CHBuffer {
  options: BufferWriterOpts;
  table: string;
  time: number = Number(new Date());
  log: Logger;
  buffers: Array<Buffer>

  /**
   * Just constructor, nothing specoal
   * @param param0
   * @param param1
   */
  constructor({ table }: BufferWriterOpts, { logger }: Deps) {
    this.log = logger.for(this)
    this.table = table;
    this.buffers = [];
  }

  /**
   * Encode record an push record to writing buffer
   */
  push(object: {}) {
    const chunk = new Buffer(JSON.stringify(object, boolToInt) + '\n');
    this.buffers.push(chunk);
  }

  /**
   * Init closing procedure before uploading to ClickHouse
   */
  async close(): Promise<BufferDust> {
    return {
      buffer: Buffer.concat(this.buffers),
      table: this.table
    };
  }
}

