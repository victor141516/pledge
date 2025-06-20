import express from "express";
import { pledgeMiddleware } from "@victor141516/pledge/adapters/express";
import { createResponse } from "@victor141516/pledge/server";

export function polyfillPromiseWithResolvers() {
  // @ts-expect-error
  Promise.withResolvers = function () {
    let resolve;
    let reject;

    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    return {
      promise,
      resolve,
      reject,
    };
  };
}

const sleep = (t: number) => new Promise<void>((res) => setTimeout(res, t));

export const mockDataFactory = () =>
  ({
    b: 4,
    c: sleep(5).then(() => 2),
    d: sleep(4).then(() => 3),
    e: sleep(3).then(() => 4),
    f: sleep(2).then(() => ({
      k: {
        l: 10,
        m: sleep(6).then(() => 11),
      },
    })),
    g: {
      h: sleep(1).then(() => 6),
      i: {
        j: sleep(0).then(() => 7),
      },
    },
  } as const);

export type MockData = ReturnType<typeof mockDataFactory>;

export function createServer() {
  const app = express();

  app.use(pledgeMiddleware);

  app.get("/", async (_, res) => {
    const response = createResponse(mockDataFactory());
    res.sendPledge(response);
  });

  return app;
}
