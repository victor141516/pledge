import { readItems } from "./items-handler";
async function* readLines(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
        while (true) {
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
                yield JSON.parse(line);
            }
        }
    }
    finally {
        reader.releaseLock();
    }
}
export async function readResponse(response) {
    const stream = (await response.body);
    const items = readLines(stream);
    return readItems(items);
}
//# sourceMappingURL=read-response.js.map