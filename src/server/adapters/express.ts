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
  destroyed?: boolean;
  writableEnded?: boolean;
  sendPledge: (vanillaResponse: globalThis.Response) => void;
};

async function streamVanillaResponse(
  expressResponse: ExpressResponse,
  vanillaResponse: Response,
  req?: any
) {
  expressResponse.status(vanillaResponse.status);
  expressResponse.setHeaders(vanillaResponse.headers);
  expressResponse.removeHeader("Transfer-Encoding");

  // Client disconnect handling is now managed by the middleware

  if (vanillaResponse.body) {
    const reader = vanillaResponse.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Check if the response is still writable
        if (expressResponse.destroyed || expressResponse.writableEnded) {
          break;
        }

        expressResponse.write(Buffer.from(value));
      }
      expressResponse.end();
    } catch (error) {
      console.error("Streaming error:", error);
      if (!expressResponse.destroyed) {
        expressResponse.destroy();
      }
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

export function pledgeMiddleware(req: any, res: any, next: () => void): void {
  res.sendPledge = async (data: any) => {
    // Create internal AbortController to handle client disconnects
    const abortController = new AbortController();
    
    // Handle client disconnect events
    const handleDisconnect = () => {
      abortController.abort();
    };
    
    req.on('close', handleDisconnect);
    req.on('aborted', handleDisconnect);
    
    try {
      await streamVanillaResponse(res, createResponse(data, abortController.signal), req);
    } finally {
      // Clean up event listeners
      req.removeListener('close', handleDisconnect);
      req.removeListener('aborted', handleDisconnect);
    }
  };

  next();
}
