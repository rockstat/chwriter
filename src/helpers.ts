
export function pick<T, K extends keyof T>(obj: T, paths: K[]): Pick<T, K> {
  return Object.assign({}, ...paths.map(prop => ({ [prop]: obj[prop] }))) as Pick<T, K>;
}

