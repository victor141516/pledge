import { describe, it, expect, vi } from "vitest";
import { createResponse } from "../../src/server/create-response";
import type { createItems } from "../../src/server/items-handler";

// Mock the items-handler
vi.mock("../../src/server/items-handler", () => ({
  createItems: vi.fn(),
}));

describe("createResponse", () => {
  it("should create a Response with correct headers", async () => {
    const mockGenerator = {
      async *[Symbol.asyncIterator]() {
        yield { type: "main-skeleton", skeleton: { test: "value" } };
      },
    } as ReturnType<typeof createItems>;

    vi.mocked(
      await import("../../src/server/items-handler")
    ).createItems.mockReturnValue(mockGenerator);

    const response = createResponse({ test: "data" });

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("Content-Type")).toBe(
      "application/x-jsonlines"
    );
    expect(response.headers.get("Transfer-Encoding")).toBe("chunked");
  });

  it("should stream JSON lines from generator", async () => {
    const mockItems = [
      { type: "main-skeleton", skeleton: { test: "value" } },
      { type: "partial", index: 0, value: "resolved" },
    ];

    const mockGenerator = {
      async *[Symbol.asyncIterator]() {
        for (const item of mockItems) {
          yield item;
        }
      },
    } as ReturnType<typeof createItems>;

    vi.mocked(
      await import("../../src/server/items-handler")
    ).createItems.mockReturnValue(mockGenerator);

    const response = createResponse({ test: "data" });
    const text = await response.text();

    const lines = text.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toEqual(mockItems[0]);
    expect(JSON.parse(lines[1]!)).toEqual(mockItems[1]);
  });

  it("should handle generator errors", async () => {
    const mockGenerator = {
      async *[Symbol.asyncIterator]() {
        throw new Error("Generator error");
      },
    } as unknown as ReturnType<typeof createItems>;

    vi.mocked(
      await import("../../src/server/items-handler")
    ).createItems.mockReturnValue(mockGenerator);

    const response = createResponse({ test: "data" });

    await expect(response.text()).rejects.toThrow("Generator error");
  });
});
