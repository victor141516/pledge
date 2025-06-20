import { describe, it, expect, vi } from "vitest";
import { createItems } from "../../src/server/items-handler";
import { readItems } from "../../src/client/items-handler";
import { polyfillPromiseWithResolvers } from "../utils";

// Mock typecheck for both server and client
vi.mock("../typecheck", () => ({
  isObject: (value: any) =>
    value !== null && typeof value === "object" && !Array.isArray(value),
  isPromise: (value: any) => value && typeof value.then === "function",
  isString: (value: any) => typeof value === "string",
}));

polyfillPromiseWithResolvers();

describe("Integration Tests", () => {
  it("should round-trip simple object with promises", async () => {
    const originalData = {
      name: "John",
      age: Promise.resolve(30),
      email: "john@example.com",
    };

    // Server side: create items
    const serverGenerator = createItems(originalData);
    const items = [];
    for await (const item of serverGenerator) {
      items.push(item);
    }

    // Client side: read items
    const clientGenerator = createAsyncGenerator(items);
    const reconstructed = await readItems(clientGenerator);

    expect(reconstructed.name).toBe("John");
    expect(reconstructed.email).toBe("john@example.com");
    expect(reconstructed.age).toBeInstanceOf(Promise);

    const resolvedAge = await reconstructed.age;
    expect(resolvedAge).toBe(30);
  });

  it("should round-trip complex nested object with multiple promises", async () => {
    const originalData = {
      user: {
        profile: Promise.resolve({
          name: "John",
          settings: Promise.resolve({ theme: "dark" }),
        }),
        posts: Promise.resolve(["post1", "post2"]),
      },
      metadata: {
        created: 12345,
        version: "1.0",
      },
    };

    // Server side
    const serverGenerator = createItems(originalData);
    const items = [];
    for await (const item of serverGenerator) {
      items.push(item);
    }

    // Client side
    const clientGenerator = createAsyncGenerator(items);
    const reconstructed = await readItems(clientGenerator);

    // Verify structure
    expect(reconstructed.user.profile).toBeInstanceOf(Promise);
    expect(reconstructed.user.posts).toBeInstanceOf(Promise);
    expect(reconstructed.metadata.created).toBe(12345);
    expect(reconstructed.metadata.version).toBe("1.0");

    // Verify resolved values
    const profile = await reconstructed.user.profile;
    expect(profile.name).toBe("John");
    expect(profile.settings).toBeInstanceOf(Promise);

    const settings = await profile.settings;
    expect(settings.theme).toBe("dark");

    const posts = await reconstructed.user.posts;
    expect(posts).toEqual(["post1", "post2"]);
  });

  it("should handle promise rejection in round-trip", async () => {
    const originalData = {
      good: Promise.resolve("success"),
      bad: Promise.reject(new Error("Failed")),
    };

    // Server side should propagate the error
    const serverGenerator = createItems(originalData);

    await expect(async () => {
      for await (const item of serverGenerator) {
        // This should throw when the rejected promise is processed
      }
    }).rejects.toThrow("Failed");
  });
});

// Helper function to create async generator from array
async function* createAsyncGenerator<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}
