import { REGEXP } from "../identifier";
import { isObject } from "../typecheck";
import type { Item } from "../types";
/**
 * Reconstructs an object from a stream of items, replacing placeholders
 * with promises that resolve when the corresponding items arrive.
 */
export function readItems(itemStream: AsyncGenerator<Item>): Promise<any> {
  const promiseResolvers = new Map<number, (value: any) => void>();

  /**
   * Recursively replaces placeholder strings with promises.
   */
  function replacePlaceholders(obj: any): void {
    if (!isObject(obj)) return;

    for (const key of Object.keys(obj)) {
      const value = obj[key];

      if (typeof value === "string") {
        const placeholderMatch = value.match(REGEXP);
        if (placeholderMatch && placeholderMatch[1]) {
          const index = parseInt(placeholderMatch[1], 10);
          const { promise, resolve } = Promise.withResolvers();
          promiseResolvers.set(index, resolve);
          obj[key] = promise;
        }
      } else if (isObject(value)) {
        replacePlaceholders(value);
      }
    }
  }

  return new Promise(async (resolveMain, rejectMain) => {
    try {
      for await (const item of itemStream) {
        switch (item.type) {
          case "main-skeleton":
            replacePlaceholders(item.skeleton);
            resolveMain(item.skeleton);
            break;

          case "partial":
            const partialResolver = promiseResolvers.get(item.index);
            if (!partialResolver) {
              throw new Error(
                `No resolver found for partial item at index: ${item.index}`
              );
            }
            partialResolver(item.value);
            promiseResolvers.delete(item.index);
            break;

          case "sub-skeleton":
            const skeletonResolver = promiseResolvers.get(item.index);
            if (!skeletonResolver) {
              throw new Error(
                `No resolver found for sub-skeleton item at index: ${item.index}`
              );
            }
            replacePlaceholders(item.skeleton);
            skeletonResolver(item.skeleton);
            promiseResolvers.delete(item.index);
            break;

          default:
            throw new Error(`Unknown item type: ${(item as any).type}`);
        }
      }
    } catch (error) {
      rejectMain(error);
    }
  });
}
