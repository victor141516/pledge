import type { Item } from "../common/types";
import { readItems } from "./items-handler";

async function* readLines(stream: ReadableStream<any>, abortSignal?: AbortSignal): AsyncGenerator<Item> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      // Check if aborted before reading
      if (abortSignal?.aborted) {
        throw new Error('Request aborted');
      }

      const { done, value } = await reader.read();

      if (done) {
        if (buffer) {
          yield JSON.parse(buffer);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          yield JSON.parse(line);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function readResponse<T = any>(response: Response, abortSignal?: AbortSignal) {
  const stream = (await response.body)!;
  const items = readLines(stream, abortSignal);
  return readItems(items, abortSignal) as Promise<T>;
}
