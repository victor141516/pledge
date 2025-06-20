export function isPromise(e: unknown): e is Promise<unknown> {
  return e instanceof Promise;
}

export function isObject(e: unknown): e is Record<string, any> {
  return e !== null && typeof e === "object";
}

export function isString(e: unknown): e is string {
  return typeof e === "string";
}
