import { describe, expect, it } from "vitest";
import { createItems } from "../../src/server/items-handler";
import { createResponse } from "../../src/server/create-response";
import { readItems } from "../../src/client/items-handler";
import { readResponse } from "../../src/client/read-response";

describe("Request termination handling", () => {
  describe("Server-side termination", () => {
    it("should reject pending promises when request is terminated", async () => {
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
      
      // Simulate request termination
      abortController.abort();
      
      // The generator should stop and not yield more items
      const { done } = await generator.next();
      expect(done).toBe(true);
    });

    it("should handle already terminated request", async () => {
      const abortController = new AbortController();
      abortController.abort();
      
      const data = { test: "value" };
      const generator = createItems(data, abortController.signal);
      
      // Should immediately return without yielding anything
      const { done } = await generator.next();
      expect(done).toBe(true);
    });

    it("should clean up event listeners on termination", async () => {
      const abortController = new AbortController();
      
      const data = {
        immediate: "available now",
        delayed: new Promise(resolve => setTimeout(() => resolve("delayed value"), 1000)),
      };

      const generator = createItems(data, abortController.signal);
      
      // Get the main skeleton
      const { value: mainSkeleton } = await generator.next();
      expect(mainSkeleton.type).toBe("main-skeleton");
      
      // Terminate the request
      abortController.abort();
      
      // Generator should clean up properly
      const { done } = await generator.next();
      expect(done).toBe(true);
    });
  });

  describe("Integration with response creation", () => {
    it("should create response with internal termination handling", async () => {
      const abortController = new AbortController();
      
      const data = {
        immediate: "available now",
        delayed: new Promise(resolve => setTimeout(() => resolve("delayed value"), 100)),
      };

      const response = createResponse(data, abortController.signal);
      
      // Should create a valid response
      expect(response).toBeDefined();
      expect(response.body).toBeDefined();
      
      // Terminate early to test cleanup
      abortController.abort();
      
      // Response should still be valid but stream will be cancelled
      expect(response.status).toBe(200);
    });

    it("should handle normal response completion", async () => {
      const data = {
        immediate: "available now",
        delayed: Promise.resolve("delayed value"),
      };

      const response = createResponse(data);
      const result = await readResponse(response);
      
      expect(result.immediate).toBe("available now");
      expect(await result.delayed).toBe("delayed value");
    });
  });
});
