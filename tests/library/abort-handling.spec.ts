import { describe, expect, it, vi } from "vitest";
import { createItems } from "../../src/server/items-handler";
import { readItems } from "../../src/client/items-handler";
import { createResponse } from "../../src/server/create-response";
import { readResponse } from "../../src/client/read-response";

describe("Abort handling", () => {
  describe("Server-side abort handling", () => {
    it("should reject pending promises when AbortSignal is aborted", async () => {
      const abortController = new AbortController();
      const slowPromise = new Promise((resolve) => setTimeout(resolve, 1000));
      
      const data = {
        immediate: "available now",
        slow: slowPromise,
      };

      const generator = createItems(data, abortController.signal);
      
      // Get the main skeleton
      const { value: mainSkeleton } = await generator.next();
      expect(mainSkeleton.type).toBe("main-skeleton");
      
      // Abort the signal
      abortController.abort();
      
      // The generator should stop and not yield more items
      const { done } = await generator.next();
      expect(done).toBe(true);
    });

    it("should handle already aborted signal", async () => {
      const abortController = new AbortController();
      abortController.abort();
      
      const data = { test: "value" };
      const generator = createItems(data, abortController.signal);
      
      // Should immediately return without yielding anything
      const { done } = await generator.next();
      expect(done).toBe(true);
    });

    it("should clean up event listeners", async () => {
      const abortController = new AbortController();
      const removeEventListenerSpy = vi.spyOn(abortController.signal, 'removeEventListener');
      
      const data = { immediate: "value" };
      const generator = createItems(data, abortController.signal);
      
      // Consume all items
      for await (const item of generator) {
        // Just consume
      }
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });
  });

  describe("Client-side abort handling", () => {
    it("should reject pending promises when AbortSignal is aborted", async () => {
      const abortController = new AbortController();
      
      // Create a mock item stream that yields a skeleton with placeholders
      async function* mockItemStream() {
        yield {
          type: "main-skeleton" as const,
          skeleton: {
            immediate: "available now",
            delayed: "$0$",
          },
        };
        
        // Simulate delay before yielding the partial item - but never yield it
        // so the promise stays pending until aborted
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const resultPromise = readItems(mockItemStream(), abortController.signal);
      const result = await resultPromise; // This should resolve with the skeleton
      
      // Abort after getting the skeleton but before the delayed promise resolves
      setTimeout(() => abortController.abort(), 50);
      
      // The delayed promise should be rejected
      await expect(result.delayed).rejects.toThrow("Request aborted");
    });

    it("should handle already aborted signal", async () => {
      const abortController = new AbortController();
      abortController.abort();
      
      async function* mockItemStream() {
        yield {
          type: "main-skeleton" as const,
          skeleton: { test: "value" },
        };
      }

      await expect(readItems(mockItemStream(), abortController.signal))
        .rejects.toThrow("Request aborted");
    });

    it("should reject individual promises when aborted", async () => {
      const abortController = new AbortController();
      
      async function* mockItemStream() {
        yield {
          type: "main-skeleton" as const,
          skeleton: {
            delayed1: "$0$",
            delayed2: "$1$",
          },
        };
        
        // Don't yield the partial items - they should be rejected when aborted
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const resultPromise = readItems(mockItemStream(), abortController.signal);
      const result = await resultPromise;
      
      // Abort the signal
      abortController.abort();
      
      // Both promises should be rejected
      await expect(result.delayed1).rejects.toThrow("Request aborted");
      await expect(result.delayed2).rejects.toThrow("Request aborted");
    });
  });

  describe("Integration tests", () => {
    it("should handle abort in full round-trip", async () => {
      const abortController = new AbortController();
      
      const data = {
        immediate: "available now",
        delayed: new Promise(resolve => setTimeout(() => resolve("delayed value"), 1000)),
      };

      const response = createResponse(data, abortController.signal);
      
      // Start reading the response
      const resultPromise = readResponse(response, abortController.signal);
      const result = await resultPromise; // Should get the skeleton
      
      // Abort after getting the skeleton but before the delayed promise resolves
      setTimeout(() => abortController.abort(), 100);
      
      // The delayed promise should be rejected
      await expect(result.delayed).rejects.toThrow("Request aborted");
    });

    it("should handle stream cancellation", async () => {
      const abortController = new AbortController();
      
      const data = {
        immediate: "available now",
        delayed: new Promise(resolve => setTimeout(() => resolve("delayed value"), 1000)),
      };

      const response = createResponse(data, abortController.signal);
      
      // Start reading the response
      const resultPromise = readResponse(response, abortController.signal);
      const result = await resultPromise; // Should get the skeleton
      
      // Abort the controller to simulate stream cancellation
      abortController.abort();
      
      // The delayed promise should be rejected due to abort
      await expect(result.delayed).rejects.toThrow("Request aborted");
    });
  });
});
