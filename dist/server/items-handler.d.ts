import type { Item } from "../common/types";
/**
 * Creates a stream of items from an object containing promises.
 * Promises are replaced with placeholders and yielded as separate items when resolved.
 */
export declare function createItems(data: any): AsyncGenerator<Item>;
//# sourceMappingURL=items-handler.d.ts.map