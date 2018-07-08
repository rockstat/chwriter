import { isObject, unzip } from './object';


type StructChild = {
  [k: string]: any;
};

/**
 * Funtion to transform nested json structure to
 * flat database-like considering locatins rules
 * @param child {Object}
 * @param nested {Set}
 * @param cols {Object}
 * @param path {Array<string>}
 * @param separator {string}
 * @param noCheck {boolean}
 * @return {Object}
 */


export const flatObject = (child: StructChild, nested: Set<string> | null, cols: StructChild, path: Array<string> = [], separator = '_', noCheck = false): StructChild => {
  //
  const acc: StructChild = {};
  const root_path = path.join(separator);
  const hasExtra: StructChild | null = (nested && nested.has(root_path)) ? {} : null;
  // console.log(`path:"${path}", root_path:"${root_path}", kv: "${hasExtra}"`)
  Object.keys(child)
    .forEach((key: string) => {
      const val = child[key];
      const isObj = isObject(val);
      const itemPath = path.concat(key).join(separator);
      // check key has extra fields container
      const keyExtra: StructChild | null = (nested && nested.has(itemPath)) ? {} : null;
      // add to extra props object
      if (hasExtra && !keyExtra) {
        if (isObj) {
          Object.assign(
            hasExtra,
            flatObject(val, null, {}, [], separator, true)
          );
        }
        else if (cols[itemPath]) {
          acc[itemPath] = val;
        }
        else {
          hasExtra[key] = val;
        }
      }
      else {
        if (isObj) {
          Object.assign(
            acc,
            flatObject(val, nested, cols, path.concat([key]), separator, noCheck)
          );
        }
        else if (cols[itemPath] || noCheck) {
          acc[itemPath] = val;
        }
        else {
          console.log(`!! not found path:${path.join('_')}_${key}, val:{val}`);
        }
      }
    });
  const extra = hasExtra && unzip(hasExtra, String, String)
  const extraPath = ((<Array<string>>[]).concat(path, ['extra'])).join(separator)
  return Object.assign(
    acc,
    // extra properties
    extra && { [extraPath + '.key']: extra.key, [extraPath + '.value']: extra.value } || {}
  );
};
