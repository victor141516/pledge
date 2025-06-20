// test/client/items-handler.test.ts
import { describe, it, expect, vi } from "vitest";
import { readItems } from "../../../library/src/client/items-handler";
import type { Item } from "../../../library/src/types";
import { polyfillPromiseWithResolvers } from "../utils";

// Mock typecheck
vi.mock("../typecheck", () => ({
  isObject: (value: any) =>
    value !== null && typeof value === "object" && !Array.isArray(value),
}));

// Helper function to create async generator from array
async function* createAsyncGenerator<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}

polyfillPromiseWithResolvers();

describe("readItems", () => {
  it("should reconstruct simple object without promises", async () => {
    const items: Item[] = [
      { type: "main-skeleton", skeleton: { name: "John", age: 30 } },
    ];

    const itemStream = createAsyncGenerator(items);
    const result = await readItems(itemStream);

    expect(result).toEqual({ name: "John", age: 30 });
  });

  it("should reconstruct object with resolved promises", async () => {
    const items: Item[] = [
      { type: "main-skeleton", skeleton: { name: "John", data: "$0$" } },
      { type: "partial", index: 0, value: "resolved value" },
    ];

    const itemStream = createAsyncGenerator(items);
    const result = await readItems(itemStream);

    expect(result).toEqual({ name: "John", data: expect.any(Promise) });

    // Check that the promise resolves correctly
    const resolvedData = await result.data;
    expect(resolvedData).toBe("resolved value");
  });

  it("should handle sub-skeleton items", async () => {
    const items: Item[] = [
      { type: "main-skeleton", skeleton: { user: "$0$" } },
      { type: "sub-skeleton", index: 0, skeleton: { name: "John", age: 30 } },
    ];

    const itemStream = createAsyncGenerator(items);
    const result = await readItems(itemStream);

    expect(result).toEqual({ user: expect.any(Promise) });

    const resolvedUser = await result.user;
    expect(resolvedUser).toEqual({ name: "John", age: 30 });
  });

  it("should handle nested promises", async () => {
    const items: Item[] = [
      { type: "main-skeleton", skeleton: { level1: { level2: "$0$" } } },
      { type: "partial", index: 0, value: "deep value" },
    ];

    const itemStream = createAsyncGenerator(items);
    const result = await readItems(itemStream);

    expect(result.level1.level2).toBeInstanceOf(Promise);

    const resolvedValue = await result.level1.level2;
    expect(resolvedValue).toBe("deep value");
  });

  it("should handle multiple promises in correct order", async () => {
    const items: Item[] = [
      { type: "main-skeleton", skeleton: { first: "$0$", second: "$1$" } },
      { type: "partial", index: 1, value: "second value" },
      { type: "partial", index: 0, value: "first value" },
    ];

    const itemStream = createAsyncGenerator(items);
    const result = await readItems(itemStream);

    expect(result.first).toBeInstanceOf(Promise);
    expect(result.second).toBeInstanceOf(Promise);

    const [firstValue, secondValue] = await Promise.all([
      result.first,
      result.second,
    ]);
    expect(firstValue).toBe("first value");
    expect(secondValue).toBe("second value");
  });

  it("should handle sub-skeleton with nested promises", async () => {
    const items: Item[] = [
      { type: "main-skeleton", skeleton: { user: "$0$" } },
      {
        type: "sub-skeleton",
        index: 0,
        skeleton: { name: "John", data: "$1$" },
      },
      { type: "partial", index: 1, value: "user data" },
    ];

    const itemStream = createAsyncGenerator(items);
    const result = await readItems(itemStream);

    const user = await result.user;
    expect(user.name).toBe("John");
    expect(user.data).toBeInstanceOf(Promise);

    const userData = await user.data;
    expect(userData).toBe("user data");
  });

  it("should not throw error for missing resolver", async () => {
    const items: Item[] = [
      { type: "main-skeleton", skeleton: { data: "no placeholder" } },
      { type: "partial", index: 0, value: "orphaned value" },
    ];

    const itemStream = createAsyncGenerator(items);

    await expect(readItems(itemStream)).resolves.not.toThrow();
  });

  it("should not throw error for unknown item type", async () => {
    const items: Item[] = [
      { type: "main-skeleton", skeleton: { data: "test" } },
      { type: "unknown-type", data: "invalid" } as any,
    ];

    const itemStream = createAsyncGenerator(items);

    await expect(readItems(itemStream)).resolves.not.toThrow();
  });
});
