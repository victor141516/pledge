import { describe, expect, it } from "vitest";
import { polyfillPromiseWithResolvers, type MockData } from "../utils";
import { readResponse } from "../../src/client";

polyfillPromiseWithResolvers();

describe("Browser integration", () => {
  it("should return the expected", async () => {
    const pledge = await readResponse<MockData>(
      new Response(`{"type":"main-skeleton","skeleton":{"b":4,"c":"$0$","d":"$1$","e":"$2$","f":"$3$","g":{"h":"$4$","i":{"j":"$5$"}}}}
{"type":"partial","index":4,"value":6}
{"type":"partial","index":5,"value":7}
{"type":"sub-skeleton","index":3,"skeleton":{"k":{"l":10,"m":"$6$"}}}
{"type":"partial","index":2,"value":4}
{"type":"partial","index":1,"value":3}
{"type":"partial","index":0,"value":2}
{"type":"partial","index":6,"value":11}
`)
    );

    expect(pledge).toMatchInlineSnapshot(`
      {
        "b": 4,
        "c": Promise {},
        "d": Promise {},
        "e": Promise {},
        "f": Promise {},
        "g": {
          "h": Promise {},
          "i": {
            "j": Promise {},
          },
        },
      }
    `);

    expect(await pledge.c).toBe(2);
    expect(await pledge.d).toBe(3);
    expect(await pledge.e).toBe(4);
    expect(await pledge.g.h).toBe(6);
    expect((await pledge.f).k.l).toBe(10);
    expect(await (await pledge.f).k.m).toBe(11);
  });
});
