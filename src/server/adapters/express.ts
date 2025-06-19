type ExpressResponse = {
  status: (code: number) => void;
  setHeaders: (
    headers: Headers | Map<string, number | string | readonly string[]>
  ) => void;
  removeHeader: (name: string) => void;
  write: (chunk: any, encoding?: BufferEncoding) => boolean;
  end: () => boolean;
  destroy: () => boolean;
  sendPledge: (bunResponse: globalThis.Response) => void;
};

async function streamBunResponse(
  expressRes: ExpressResponse,
  bunResponse: Response
) {
  expressRes.status(bunResponse.status);
  expressRes.setHeaders(bunResponse.headers);
  expressRes.removeHeader("Transfer-Encoding");

  if (bunResponse.body) {
    const reader = bunResponse.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        expressRes.write(Buffer.from(value));
      }
      expressRes.end();
    } catch (error) {
      console.error("Streaming error:", error);
      expressRes.destroy();
    } finally {
      reader.releaseLock();
    }
  } else {
    expressRes.end();
  }
}

declare global {
  namespace Express {
    interface Response {
      sendPledge(response: globalThis.Response): Promise<void>;
    }
  }
}

export function pledgeMiddleware(_: unknown, res: any, next: () => void): void {
  res.sendPledge = async (bunResponse: globalThis.Response) =>
    streamBunResponse(res, bunResponse);

  next();
}
