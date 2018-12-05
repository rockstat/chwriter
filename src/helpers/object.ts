
export function pick<T, K extends keyof T>(obj: T, paths: K[]): Pick<T, K> {
  return Object.assign({}, ...paths.map(prop => ({ [prop]: obj[prop] }))) as Pick<T, K>;
}

/**
 * Check is Object
 */
export const isObject = (o: any) => {
  return (!!o && typeof o === 'object' && Object.prototype.toString.call(o) === '[object Object]')
};

export const isArray = (inp: any) => {
  return (!!inp && typeof inp === 'object' && Array.isArray(inp))
};


export const arrayToObject = (list: Array<[string, any]>) => {
  const result:{[k:string]:any} = {}
  for(let [k, v] of list){
    result[k] = v
  }
  return result;
}

export type ZipFilter<T> = (x: any) => T;
export type ZipObject<V> = Array<[string, any]>;

/**
 * Function implements zip algorithm with filtration
 */
export function unzip<V>(obj: ZipObject<V>, keyFilter: ZipFilter<string>, valFilter: ZipFilter<V>) {
  const key = [];
  const value = [];
  if (obj) {
    for (let [k, v] of obj) {
      if (keyFilter) {
        k = keyFilter(k);
      }
      if (valFilter) {
        v = valFilter(v);
      }
      key.push(k);
      value.push(v);
    }
  }
  return { key, value };
};
