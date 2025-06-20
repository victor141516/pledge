import { createResponse } from "../create-response";
async function streamVanillaResponse(expressResponse, vanillaResponse) {
    expressResponse.status(vanillaResponse.status);
    expressResponse.setHeaders(vanillaResponse.headers);
    expressResponse.removeHeader("Transfer-Encoding");
    if (vanillaResponse.body) {
        const reader = vanillaResponse.body.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                expressResponse.write(Buffer.from(value));
            }
            expressResponse.end();
        }
        catch (error) {
            console.error("Streaming error:", error);
            expressResponse.destroy();
        }
        finally {
            reader.releaseLock();
        }
    }
    else {
        expressResponse.end();
    }
}
export function pledgeMiddleware(_, res, next) {
    res.sendPledge = async (data) => streamVanillaResponse(res, createResponse(data));
    next();
}
//# sourceMappingURL=express.js.map