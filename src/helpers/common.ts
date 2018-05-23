
export function listVal(input?: string | string[]): string | undefined {
  return Array.isArray(input) ? input[0] : input;
}

export function pick<T, K extends keyof T>(obj: T, paths: K[]): Pick<T, K> {
  return { ...paths.reduce((mem, key) => ({ ...mem, [key]: obj[key] }), {}) } as Pick<T, K>;
}

export function pick2<T, K extends keyof T>(obj: T, paths: K[]): Pick<T, K> {
  return Object.assign({}, ...paths.map(prop => ({ [prop]: obj[prop] }))) as Pick<T, K>;
}

