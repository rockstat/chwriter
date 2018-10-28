import { parse as urlParse } from 'url';


/**
 * DSN struct
 */
export interface DSNStruct {
    port: string;
    hostname: string;
    protocol: string;
    db: string;
    user?: string;
    password?: string;
  }
  
  /**
   * Parses string DSN to struct
   * @param dsn String DSN
   */
  export const dsnParse = (dsn: string): DSNStruct => {
    const { port, hostname, protocol, path, auth } = urlParse(dsn);
    let user, password, db;
    if (path && path.startsWith('/')) {
      db = path.substr(1);
    }
    if (auth) {
      [user, password] = auth.split(':');
    }
    if (!protocol || !db || !hostname || !port) throw new Error('Wrong configuration');
    return {
      port, hostname, protocol, db, user, password
    }
  }
  