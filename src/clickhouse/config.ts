import {CHConfig} from '@app/types'


export class CHConfigHandler {
  /**
   * Handling ClickHouse table extendability via _options: extend: basename
   * @param config ClickHouse configuration
   */
  static extend(config: CHConfig): CHConfig {
    const { base, tables, ...rest } = config;
    for (const table of Object.keys(tables)) {
      const definition = tables[table];
      const { _options, ...cols } = definition;
      // excluding extend action
      const { extend, ...options } = _options;
      // extenxing
      if (extend && tables[extend]) {
        // extracting source table schema ans opts
        const { _options: ioptions, ...icols } = tables[extend];
        // extending base table
        Object.assign(options, ioptions);
        Object.assign(cols, icols);
      }
      // Moving back;
      Object.assign(definition, base, cols, { _options });
    }
    return { base, tables, ...rest };
  }

}
