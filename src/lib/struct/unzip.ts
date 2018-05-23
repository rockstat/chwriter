type ZipFilter<T> = (x: any) => T;
type ZipObject<V> = { [k: string]: V };
/**
 * Function implements zip algorithm with filtration
 */

export function unzip<V>(obj: ZipObject<V>, keyFilter: ZipFilter<string>, valFilter: ZipFilter<V>) {
  const key = [];
  const value = [];
  if (obj) {
    for (let [k, v] of Object.entries(obj)) {
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
