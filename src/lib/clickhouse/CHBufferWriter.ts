import { Deps } from "@app/AppServer";
import { Logger } from "@app/log";

// const Promise = require('bluebird');
const fs = require('fs');
// const writeAsync = Promise.promisify(fs.write);
// const waitUntil = require('../functions/waitUntil');

const boolToInt = (k: string, v: any) => (typeof v === 'boolean' ? Number(v) : v);

interface BufferWriterOpts {
  table: string;
}


export interface BuffDust {
  table: string;
  buffer: Buffer;
  fileName?: string;
}


export class CHBufferWriter {

  options: BufferWriterOpts;
  log: Logger;
  buffers: Array<Buffer>


  constructor(options: BufferWriterOpts, deps: Deps) {

    this.options = options;
    // this.startDate = new Date();
    // this.folder = 'upload_ch';
    // this.fileName = `${this.startDate.toISOString()}.log`;
    // this.objectName = `${this.folder}/${this.table}-${this.fileName}`;

    this.log = deps.logger.for(this)

    this.buffers = [];
    // this.written = 0;
    // this.fileReady = false;
    // this.writing = false;

    // fs.openAsync(this.objectName, 'w')
    //   .then(fd => {
    //     this.fd = fd;
    //     this.fileReady = true;
    //     this.scheduleWrite();
    //   })
    //   .catch(err => {
    //     this.log.error(err, 'Error writing to temp file');
    //   });
  }

  /**
   * Push record to writing buffer
   * @param object
   */
  push(object: any) {
    const chunk = new Buffer(JSON.stringify(object, boolToInt) + '\n');
    this.buffers.push(chunk);
  }


  /**
   * Writing data to temp file
   * @return {Promise<void>}
   */
  async doWrite() {

    // this.ensureFileReady();

    // if (!this.unwritten) {
    //   return this.scheduleWrite();
    // }

    // const chunks = this.buffers.slice(this.written);
    // this.writing = true;

    // try {
    //   await writeAsync(this.fd, Buffer.concat(chunks));
    //   this.written += chunks.length;

    // } catch (error) {

    //   this.log.error(error);
    // } finally {

    //   this.writing = false;
    //   this.scheduleWrite()
    // }
  }

  /**
   * Write scheduling
   * @param ms
   */
  // scheduleWrite(ms = 100) {

  //   setTimeout(() => this.doWrite(), ms)

  // }


  /**
   * Init closing procedure before uploading to ClickHouse
   * @return {Promise<{buffer: Buffer, table: string, filename: string}>}
   */
  async close(): Promise<BuffDust> {

    // if (this.unwritten) {
    //   this.log.error('write not complete :( but i have to close this file.');
    // }

    // await fs.closeAsync(this.fd);

    return {
      buffer: Buffer.concat(this.buffers),
      table: this.table
    };

  }

  /**
   * Ensure that destination file opened and ready to writing
   * @return {boolean}
   */
  // ensureFileReady() {
  //   if (this.fileReady) {
  //     return true;
  //   }
  //   throw new Error('File not ready');
  // }

  /**
   * UnWritten chunks amount
   * @return {number}
   */
  // get unwritten() {
  //   return this.buffers.length - this.written;
  // }

  /**
   * Returns destination table name
   * @return {string}
   */
  get table() {
    return this.options.table;
  }

}

