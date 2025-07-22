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

  // Get the abort controller from the response if available
  const abortController = (vanillaResponse as any)._abortController;

  // Handle request close/abort events
  const handleRequestClose = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  if (req) {
    req.on('close', handleRequestClose);
    req.on('aborted', handleRequestClose);
  }

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
      
      // Clean up event listeners
      if (req) {
        req.removeListener('close', handleRequestClose);
        req.removeListener('aborted', handleRequestClose);
      }
    }
  } else {
    expressResponse.end();
  }
}

declare global {
  namespace Express {
    interface Response {
      sendPledge(data: any, abortSignal?: AbortSignal): Promise<void>;
    }
  }
}

export function pledgeMiddleware(req: any, res: any, next: () => void): void {
  res.sendPledge = async (data: any, abortSignal?: AbortSignal) =>
    streamVanillaResponse(res, createResponse(data, abortSignal), req);

  next();
}
