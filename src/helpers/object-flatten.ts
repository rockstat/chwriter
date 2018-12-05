import { isObject, isArray, unzip } from './object';
import * as Debug from 'debug';

type StructChild = {
  [k: string]: any;
};
type StructListChild = Array<[string, any]>;


const debug = Debug('flatten')


/**
 * Funtion to transform nested json structure to
 * flat database-like considering locatins rules
 * @param child {Object}
 * @param extraLocations {Set}
 * @param cols {Object}
 * @param path {Array<string>}
 * @param separator {string}
 * @param noCheck {boolean}
 * @return {Object}
 */
export const flatObject = (child: StructChild, extraLocations: Set<string> | null, cols: StructChild, path: Array<string> = [], separator = '_', lastExtra: StructListChild, lastExtraDistance: Array<string> = []): StructListChild => {
  const listAcc: StructListChild = []
  const rootPath = path.join(separator);
  const pref = rootPath ? rootPath + separator : rootPath
  const hasExtra = extraLocations && extraLocations.has(rootPath);
  if (hasExtra) {
    lastExtraDistance = []
    lastExtra = []
  }
  const lastExtraDistStr = lastExtraDistance.length
    ? lastExtraDistance.join(separator) + separator
    : '';

  debug(`path:"${path}", root_path:"${rootPath}", lastExtraDistance: "${lastExtraDistance}"`)
  for (const [key, val] of Object.entries(child)) {
    const writeVal = isArray(val)
      ? val.map((e: any) => (typeof e === 'object')
        ? JSON.stringify(e)
        : e
      )
      : val
    const isObj = isObject(val);
    const itemPath = pref + key;

    // check key has extra fields container
    debug(`> [${key}] path: ${itemPath}`)

    if (isObj) {
      debug('  - is obj')
      const res = flatObject(
        val,
        extraLocations,
        cols,
        path.concat([key]),
        separator,
        lastExtra,
        [...lastExtraDistance, key]
      );
      listAcc.push(...res)
    }
    else if (cols[itemPath]) {
      debug('  - has col')
      listAcc.push([itemPath, writeVal])
    }
    else {
      // if (extra) {
      debug('  - else - extra')
      lastExtra.push([lastExtraDistStr + key, writeVal])
    }
  }

  if (hasExtra) {
    const extraArrays = unzip(lastExtra, String, String)

    listAcc.push(
      [`${pref}extra.key`, extraArrays.key],
      [`${pref}extra.value`, extraArrays.value],
    )
  }
  return listAcc;
};
