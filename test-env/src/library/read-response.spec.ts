import { describe, it, expect, vi } from "vitest";
import { readResponse } from "../../../library/src/client/read-response";

// Mock items-handler
vi.mock("../../../library/src/client/items-handler", () => ({
  readItems: vi.fn(),
}));

describe("readResponse", () => {
  it("should read and parse JSON lines from response", async () => {
    const mockItems = [
      { type: "main-skeleton", skeleton: { test: "$0$" } },
      { type: "partial", index: 0, value: "resolved" },
    ];

    const jsonLines = mockItems.map((item) => JSON.stringify(item)).join("\n");
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(jsonLines));
        controller.close();
      },
    });

    const response = new Response(stream);
    const expectedResult = { test: "resolved" };

    vi.mocked(
      await import("../../../library/src/client/items-handler")
    ).readItems.mockResolvedValue(expectedResult);

    const result = await readResponse(response);

    expect(result).toEqual(expectedResult);
  });

  it("should handle chunked data", async () => {
    const mockItems = [
      { type: "main-skeleton", skeleton: { test: "$0$" } },
      { type: "partial", index: 0, value: "resolved" },
    ];

    const stream = new ReadableStream({
      start(controller) {
        // Send data in chunks
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(mockItems[0]) + "\n")
        );
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(mockItems[1]) + "\n")
        );
        controller.close();
      },
    });

    const response = new Response(stream);
    const expectedResult = { test: "resolved" };

    vi.mocked(
      await import("../../../library/src/client/items-handler")
    ).readItems.mockResolvedValue(expectedResult);

    const result = await readResponse(response);

    expect(result).toEqual(expectedResult);
  });

  it("should handle partial JSON lines in chunks", async () => {
    const item = { type: "main-skeleton", skeleton: { test: "value" } };
    const jsonLine = JSON.stringify(item) + "\n";

    const stream = new ReadableStream({
      start(controller) {
        // Split JSON line across multiple chunks
        const midpoint = Math.floor(jsonLine.length / 2);
        controller.enqueue(
          new TextEncoder().encode(jsonLine.slice(0, midpoint))
        );
        controller.enqueue(new TextEncoder().encode(jsonLine.slice(midpoint)));
        controller.close();
      },
    });

    const response = new Response(stream);
    const expectedResult = { test: "value" };

    vi.mocked(
      await import("../../../library/src/client/items-handler")
    ).readItems.mockResolvedValue(expectedResult);

    const result = await readResponse(response);

    expect(result).toEqual(expectedResult);
  });
});
