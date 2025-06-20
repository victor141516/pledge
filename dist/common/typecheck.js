export function isPromise(e) {
    return e instanceof Promise;
}
export function isObject(e) {
    return e !== null && typeof e === "object" && !Array.isArray(e);
}
export function isString(e) {
    return typeof e === "string";
}
export function isArray(e) {
    return Array.isArray(e);
}
//# sourceMappingURL=typecheck.js.map