import { REGEXP } from "../common/identifier";
import { isArray, isObject, isPromise, isString } from "../common/typecheck";
import type { Item } from "../common/types";

/**
 * Creates a stream of items from an object containing promises.
 * Promises are replaced with placeholders and yielded as separate items when resolved.
 */
export async function* createItems(data: any, abortSignal?: AbortSignal): AsyncGenerator<Item> {
  const pendingPromises = new Map<number, Promise<Item>>();
  const promiseRejecters = new Map<number, (reason?: any) => void>();
  let nextPromiseIndex = 0;

  // Handle abort signal
  const handleAbort = () => {
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';
    
    // Reject all pending promises
    for (const reject of promiseRejecters.values()) {
      reject(abortError);
    }
    
    // Clear the maps
    pendingPromises.clear();
    promiseRejecters.clear();
  };

  if (abortSignal) {
    if (abortSignal.aborted) {
      handleAbort();
      return;
    }
    abortSignal.addEventListener('abort', handleAbort);
  }

  /**
   * Creates an Item from a promise, determining whether it should be
   * a partial item (primitive value) or sub-skeleton (object).
   */
  async function createItemFromPromise(
    promise: Promise<any>,
    index: number
  ): Promise<Item> {
    // Create a promise that can be rejected externally
    let rejectPromise: (reason?: any) => void;
    const abortablePromise = new Promise<any>((resolve, reject) => {
      rejectPromise = reject;
      promise.then(resolve, reject);
    });

    // Store the reject function for potential abort
    promiseRejecters.set(index, rejectPromise!);

    try {
      const resolvedValue = await abortablePromise;
      
      // Remove the rejecter since promise resolved successfully
      promiseRejecters.delete(index);

      if (isObject(resolvedValue)) {
        return {
          type: "sub-skeleton",
          index,
          skeleton: processObject(resolvedValue),
        };
      } else {
        return {
          type: "partial",
          index,
          value: resolvedValue,
        };
      }
    } catch (error) {
      // Remove the rejecter since promise is no longer pending
      promiseRejecters.delete(index);
      throw error;
    }
  }

  /**
   * Recursively processes an object, replacing promises with placeholders
   * and tracking them for later resolution.
   */
  function processObject(obj: any): any {
    if (!isObject(obj)) {
      return obj;
    }

    if (isArray(obj)) {
      return obj.map((item) => processObject(item));
    }

    const processed = { ...obj };

    for (const key of Object.keys(processed)) {
      const value = processed[key];

      if (isPromise(value)) {
        const promiseIndex = nextPromiseIndex;
        nextPromiseIndex++;
        const placeholder = `$${promiseIndex}$`;

        // Create a promise that will resolve to an Item
        const itemPromise = createItemFromPromise(value, promiseIndex);
        pendingPromises.set(promiseIndex, itemPromise);

        processed[key] = placeholder;
      } else if (isObject(value)) {
        processed[key] = processObject(value);
      } else if (isString(value)) {
        if (REGEXP.test(value)) {
          throw new Error(
            "Cannot use string with format $[0-9]+$. You're using: " + value
          );
        }
      }
    }

    return processed;
  }

  // Yield the main skeleton first
  yield {
    type: "main-skeleton",
    skeleton: processObject(data),
  };

  // Yield resolved items as they complete
  try {
    while (pendingPromises.size > 0) {
      // Check if aborted before waiting for promises
      if (abortSignal?.aborted) {
        handleAbort();
        return;
      }

      const activePromises = Array.from(pendingPromises.values());
      const resolvedItem = await Promise.race(activePromises);

      if (!("index" in resolvedItem)) {
        throw new Error(
          `Unexpected type of item: ${JSON.stringify(resolvedItem)}`
        );
      }

      // Remove the resolved promise from pending set
      pendingPromises.delete(resolvedItem.index);

      yield resolvedItem;
    }
  } finally {
    // Clean up event listener
    if (abortSignal) {
      abortSignal.removeEventListener('abort', handleAbort);
    }
  }
}
