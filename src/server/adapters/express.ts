import { createResponse } from "../create-response";

type ExpressResponse = {
  status: (code: number) => void;
  setHeaders: (
    headers: Headers | Map<string, number | string | readonly string[]>
  ) => void;
  removeHeader: (name: string) => void;
  write: (chunk: any, encoding?: BufferEncoding) => boolean;
  end: () => boolean;
  destroy: () => boolean;
  sendPledge: (vanillaResponse: globalThis.Response) => void;
};

async function streamVanillaResponse(
  expressResponse: ExpressResponse,
  vanillaResponse: Response
) {
  expressResponse.status(vanillaResponse.status);
  expressResponse.setHeaders(vanillaResponse.headers);
  expressResponse.removeHeader("Transfer-Encoding");

  if (vanillaResponse.body) {
    const reader = vanillaResponse.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        expressResponse.write(Buffer.from(value));
      }
      expressResponse.end();
    } catch (error) {
      console.error("Streaming error:", error);
      expressResponse.destroy();
    } finally {
      reader.releaseLock();
    }
  } else {
    expressResponse.end();
  }
}

declare global {
  namespace Express {
    interface Response {
      sendPledge(data: any): Promise<void>;
    }
  }
}

export function pledgeMiddleware(_: unknown, res: any, next: () => void): void {
  res.sendPledge = async (data: any) =>
    streamVanillaResponse(res, createResponse(data));

  next();
}
