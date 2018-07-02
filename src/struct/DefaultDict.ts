export type DefaultDict<T> = {
  get: (key: string) => T;
  set: (key: string, val: T) => void;
  has: (key: string) => boolean;
  keys: () => Array<string>;
  values: () => Array<T>;
  entries: () => Array<[string, T]>;
  dict: { [k: string]: T };
}

/**
 * Simple DefaultDict Implementation
 */
export function defaultDict<T>(type: new () => T): DefaultDict<T> {
  const dict: { [k: string]: T } = {};
  return {
    get: (key: string): T => {
      if (!dict[key]) {
        dict[key] = <T>new type();
      }
      return dict[key];
    },
    set: (key: string, val: T) => dict[key] = val,
    has: (key: string) => dict.hasOwnProperty(key),
    keys: () => Object.keys(dict),
    values: () => Object.values(dict),
    entries: () => Object.entries(dict),
    dict: dict
  };
}
