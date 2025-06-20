import { describe, it, expect, vi } from "vitest";
import { createItems } from "../../src/server/items-handler";

describe("createItems", () => {
  it("should handle simple object without promises", async () => {
    const data = { name: "John", age: 30 };
    const generator = createItems(data);

    const items = [];
    for await (const item of generator) {
      items.push(item);
    }

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      type: "main-skeleton",
      skeleton: { name: "John", age: 30 },
    });
  });

  it("should handle object with single promise resolving to primitive", async () => {
    const promise = Promise.resolve("resolved value");
    const data = { name: "John", asyncData: promise };

    const generator = createItems(data);
    const items = [];
    for await (const item of generator) {
      items.push(item);
    }

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      type: "main-skeleton",
      skeleton: { name: "John", asyncData: "$0$" },
    });
    expect(items[1]).toEqual({
      type: "partial",
      index: 0,
      value: "resolved value",
    });
  });

  it("should handle object with promise resolving to object", async () => {
    const promise = Promise.resolve({ nested: "value", count: 42 });
    const data = { name: "John", asyncObject: promise };

    const generator = createItems(data);
    const items = [];
    for await (const item of generator) {
      items.push(item);
    }

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      type: "main-skeleton",
      skeleton: { name: "John", asyncObject: "$0$" },
    });
    expect(items[1]).toEqual({
      type: "sub-skeleton",
      index: 0,
      skeleton: { nested: "value", count: 42 },
    });
  });

  it("should handle multiple promises", async () => {
    const promise1 = Promise.resolve("first");
    const promise2 = Promise.resolve(123);
    const data = { first: promise1, second: promise2, sync: "data" };

    const generator = createItems(data);
    const items = [];
    for await (const item of generator) {
      items.push(item);
    }

    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({
      type: "main-skeleton",
      skeleton: { first: "$0$", second: "$1$", sync: "data" },
    });

    // Items can arrive in any order due to Promise.race
    const partialItems = items.slice(1);
    expect(partialItems).toHaveLength(2);
    expect(
      partialItems.some(
        (item) =>
          "index" in item &&
          item.index === 0 &&
          "value" in item &&
          item.value === "first"
      )
    ).toBe(true);
    expect(
      partialItems.some(
        (item) =>
          "index" in item &&
          item.index === 1 &&
          "value" in item &&
          item.value === 123
      )
    ).toBe(true);
  });

  it("should handle nested objects with promises", async () => {
    const promise = Promise.resolve("nested value");
    const data = {
      level1: {
        level2: {
          asyncData: promise,
          syncData: "sync",
        },
      },
    };

    const generator = createItems(data);
    const items = [];
    for await (const item of generator) {
      items.push(item);
    }

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      type: "main-skeleton",
      skeleton: {
        level1: {
          level2: {
            asyncData: "$0$",
            syncData: "sync",
          },
        },
      },
    });
    expect(items[1]).toEqual({
      type: "partial",
      index: 0,
      value: "nested value",
    });
  });

  it("should throw error for strings matching placeholder pattern", async () => {
    const data = { badString: "$123$" };

    await expect(async () => {
      for await (const _ of createItems(data)) {
      }
    }).rejects.toThrow(
      "Cannot use string with format $[0-9]+$. You're using: $123$"
    );
  });

  it("should handle promises that resolve to objects with more promises", async () => {
    const nestedPromise = Promise.resolve("deeply nested");
    const outerPromise = Promise.resolve({ nested: nestedPromise });
    const data = { outer: outerPromise };

    const generator = createItems(data);
    const items = [];
    for await (const item of generator) {
      items.push(item);
    }

    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({
      type: "main-skeleton",
      skeleton: { outer: "$0$" },
    });
    expect(items[1]).toEqual({
      type: "sub-skeleton",
      index: 0,
      skeleton: { nested: "$1$" },
    });
    expect(items[2]).toEqual({
      type: "partial",
      index: 1,
      value: "deeply nested",
    });
  });

  it("should handle promise rejection", async () => {
    const promise = Promise.reject(new Error("Promise failed"));
    const data = { failing: promise };

    const generator = createItems(data);

    await expect(async () => {
      for await (const item of generator) {
        // This should throw
      }
    }).rejects.toThrow("Promise failed");
  });

  it("should handle empty object", async () => {
    const data = {};
    const generator = createItems(data);

    const items = [];
    for await (const item of generator) {
      items.push(item);
    }

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      type: "main-skeleton",
      skeleton: {},
    });
  });
});
