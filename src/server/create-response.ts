import { createItems } from "./items-handler";

export function createResponse(toSend: any, abortSignal?: AbortSignal) {
  const abortController = new AbortController();
  const combinedSignal = abortSignal ? 
    AbortSignal.any([abortSignal, abortController.signal]) : 
    abortController.signal;
  
  const generator = createItems(toSend, combinedSignal);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const item of generator) {
          // Check if aborted before processing each item
          if (combinedSignal.aborted) {
            controller.close();
            return;
          }

          const jsonLine = JSON.stringify(item) + "\n";
          controller.enqueue(encoder.encode(jsonLine));
        }
        controller.close();
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          controller.close();
        } else {
          controller.error(error);
        }
      }
    },
    cancel() {
      // Abort the generator when the stream is cancelled
      abortController.abort();
    }
  });

  const response = new globalThis.Response(stream, {
    headers: {
      "Content-Type": "application/x-jsonlines",
      "Transfer-Encoding": "chunked",
    },
  });

  // Store the abort controller on the response for external access
  // Use a non-enumerable property to avoid it appearing in JSON serialization
  Object.defineProperty(response, '_abortController', {
    value: abortController,
    writable: false,
    enumerable: false,
    configurable: false
  });

  return response;
}
