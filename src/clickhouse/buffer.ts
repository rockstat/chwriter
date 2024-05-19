import { CHBufferWriterOpts, CHBufferDust } from '@app/types';

/**
 * Custom JSON filter for ClickHouse adaptation
 */
function replacer(k: string, v: any): any {
  if(v===null) return;
  return typeof v === 'boolean' ? Number(v) : v
}

export class CHBuffer {
  time: number = Number(new Date());
  options: CHBufferWriterOpts;
  table: string;
  buffers: Array<Buffer>
  count: number = 0;

  /**
   * Created new instanse of buffer writter
   * @param param0 CHBufferWriterOpts struct
   */
  constructor({ table }: CHBufferWriterOpts) {
    this.table = table;
    this.buffers = [];
  }

  /**
   * Encode record an push record to writing buffer
   */
  push(object: {}) {
    const chunk = Buffer.from(JSON.stringify(object, replacer) + '\n');
    this.buffers.push(chunk); 
    this.count++;
  }

  /**
   * Init closing procedure before uploading to ClickHouse
   */
  async close(): Promise<CHBufferDust> {
    return {
      buffer: Buffer.concat(this.buffers),
      table: this.table,
      time: this.time,
      count: this.count
    };
  }
}

