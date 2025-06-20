import request from "supertest";
import { describe, expect, it } from "vitest";
import { createServer } from "../utils";

describe("Express request", () => {
  it("should contain the expected response", async () => {
    const app = createServer();
    const res = await request(app).get("/");
    expect(res.text).toMatchInlineSnapshot(`
      "{"type":"main-skeleton","skeleton":{"b":4,"c":"$0$","d":"$1$","e":"$2$","f":"$3$","g":{"h":"$4$","i":{"j":"$5$"}}}}
      {"type":"partial","index":4,"value":6}
      {"type":"partial","index":5,"value":7}
      {"type":"sub-skeleton","index":3,"skeleton":{"k":{"l":10,"m":"$6$"}}}
      {"type":"partial","index":2,"value":4}
      {"type":"partial","index":1,"value":3}
      {"type":"partial","index":0,"value":2}
      {"type":"partial","index":6,"value":11}
      "
    `);
  });
});
