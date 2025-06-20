import type { Item } from "../common/types";
/**
 * Reconstructs an object from a stream of items, replacing placeholders
 * with promises that resolve when the corresponding items arrive.
 */
export declare function readItems(itemStream: AsyncGenerator<Item>): Promise<any>;
//# sourceMappingURL=items-handler.d.ts.map