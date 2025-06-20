import { REGEXP } from "../common/identifier";
import { isObject } from "../common/typecheck";
/**
 * Reconstructs an object from a stream of items, replacing placeholders
 * with promises that resolve when the corresponding items arrive.
 */
export function readItems(itemStream) {
    const promiseResolvers = new Map();
    /**
     * Recursively replaces placeholder strings with promises.
     */
    function replacePlaceholders(obj) {
        if (!isObject(obj))
            return;
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
            }
            else if (isObject(value)) {
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
                            console.warn(`No resolver found for partial item at index: ${item.index} ${JSON.stringify(item)}`);
                            break;
                        }
                        partialResolver(item.value);
                        promiseResolvers.delete(item.index);
                        break;
                    case "sub-skeleton":
                        const skeletonResolver = promiseResolvers.get(item.index);
                        if (!skeletonResolver) {
                            console.warn(`No resolver found for sub-skeleton item at index: ${item.index} ${JSON.stringify(item)}`);
                            break;
                        }
                        replacePlaceholders(item.skeleton);
                        skeletonResolver(item.skeleton);
                        promiseResolvers.delete(item.index);
                        break;
                    default:
                        console.warn("Unknown item type:", JSON.stringify(item));
                }
            }
        }
        catch (error) {
            rejectMain(error);
        }
    });
}
//# sourceMappingURL=items-handler.js.map