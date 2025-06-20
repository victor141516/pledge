import { REGEXP } from "../identifier";
import { isObject, isPromise, isString } from "../typecheck";
import type { Item } from "../types";

/**
 * Creates a stream of items from an object containing promises.
 * Promises are replaced with placeholders and yielded as separate items when resolved.
 */
export async function* createItems(data: any): AsyncGenerator<Item> {
  const pendingPromises = new Map<number, Promise<Item>>();
  let nextPromiseIndex = 0;

  /**
   * Creates an Item from a promise, determining whether it should be
   * a partial item (primitive value) or sub-skeleton (object).
   */
  async function createItemFromPromise(
    promise: Promise<any>,
    index: number
  ): Promise<Item> {
    const resolvedValue = await promise;

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
  }

  /**
   * Recursively processes an object, replacing promises with placeholders
   * and tracking them for later resolution.
   */
  function processObject(obj: any): any {
    if (!isObject(obj)) {
      return obj;
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
  while (pendingPromises.size > 0) {
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
}
