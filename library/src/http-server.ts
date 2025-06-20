import express from "express";
import { pledgeMiddleware } from "./server/adapters/express";
import { createResponse } from "./server/create-response";

const app = express();

const sleep = (t: number) => new Promise<void>((res) => setTimeout(res, t));

const mockDataFactory = () =>
  ({
    b: 4,
    c: sleep((6 - 1) * 1000).then(() => 2),
    d: sleep((6 - 2) * 1000).then(() => 3),
    e: sleep((6 - 3) * 1000).then(() => 4),
    f: sleep((6 - 4) * 1000).then(() => ({
      k: {
        l: 10,
        m: sleep(1000).then(() => 11),
      },
    })),
    g: {
      h: sleep((6 - 5) * 1000).then(() => 6),
      i: {
        j: sleep((6 - 6) * 1000).then(() => 7),
      },
    },
  } as const);

app.use(pledgeMiddleware);

app.get("/", async (req, res) => {
  const response = createResponse(mockDataFactory());
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.sendPledge(response);
});

app.listen(13000);
