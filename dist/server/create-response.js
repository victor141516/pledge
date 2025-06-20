import { createItems } from "./items-handler";
export function createResponse(toSend) {
    const generator = createItems(toSend);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for await (const item of generator) {
                    const jsonLine = JSON.stringify(item) + "\n";
                    controller.enqueue(encoder.encode(jsonLine));
                }
                controller.close();
            }
            catch (error) {
                controller.error(error);
            }
        },
    });
    return new globalThis.Response(stream, {
        headers: {
            "Content-Type": "application/x-jsonlines",
            "Transfer-Encoding": "chunked",
        },
    });
}
//# sourceMappingURL=create-response.js.map