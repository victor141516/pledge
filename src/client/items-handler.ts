import { REGEXP } from "../common/identifier";
import { isObject } from "../common/typecheck";
import type { Item } from "../common/types";

/**
 * Reconstructs an object from a stream of items, replacing placeholders
 * with promises that resolve when the corresponding items arrive.
 */
export function readItems(itemStream: AsyncGenerator<Item>, abortSignal?: AbortSignal): Promise<any> {
  const promiseResolvers = new Map<number, (value: any) => void>();
  const promiseRejecters = new Map<number, (reason?: any) => void>();

  // Handle abort signal
  const handleAbort = () => {
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';
    
    // Reject all pending promises
    for (const reject of promiseRejecters.values()) {
      reject(abortError);
    }
    
    // Clear the maps
    promiseResolvers.clear();
    promiseRejecters.clear();
  };

  if (abortSignal) {
    if (abortSignal.aborted) {
      return Promise.reject(new Error('Request aborted'));
    }
    abortSignal.addEventListener('abort', handleAbort);
  }

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
          const { promise, resolve, reject } = Promise.withResolvers();
          promiseResolvers.set(index, resolve);
          promiseRejecters.set(index, reject);
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
        // Check if aborted before processing each item
        if (abortSignal?.aborted) {
          handleAbort();
          rejectMain(new Error('Request aborted'));
          return;
        }

        switch (item.type) {
          case "main-skeleton":
            replacePlaceholders(item.skeleton);
            resolveMain(item.skeleton);
            break;

          case "partial":
            const partialResolver = promiseResolvers.get(item.index);
            if (!partialResolver) {
              console.warn(
                `No resolver found for partial item at index: ${
                  item.index
                } ${JSON.stringify(item)}`
              );
              break;
            }
            partialResolver(item.value);
            promiseResolvers.delete(item.index);
            promiseRejecters.delete(item.index);
            break;

          case "sub-skeleton":
            const skeletonResolver = promiseResolvers.get(item.index);
            if (!skeletonResolver) {
              console.warn(
                `No resolver found for sub-skeleton item at index: ${
                  item.index
                } ${JSON.stringify(item)}`
              );
              break;
            }
            replacePlaceholders(item.skeleton);
            skeletonResolver(item.skeleton);
            promiseResolvers.delete(item.index);
            promiseRejecters.delete(item.index);
            break;

          default:
            console.warn("Unknown item type:", JSON.stringify(item));
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        handleAbort();
      }
      rejectMain(error);
    } finally {
      // Clean up event listener
      if (abortSignal) {
        abortSignal.removeEventListener('abort', handleAbort);
      }
    }
  });
}
