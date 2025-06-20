import { describe, it, expect } from "vitest";
import { REGEXP } from "../../src/common/identifier";

describe("REGEXP", () => {
  it("should match valid placeholder patterns", () => {
    expect(REGEXP.test("$0$")).toBe(true);
    expect(REGEXP.test("$1$")).toBe(true);
    expect(REGEXP.test("$123$")).toBe(true);
    expect(REGEXP.test("$999$")).toBe(true);
  });

  it("should not match invalid patterns", () => {
    expect(REGEXP.test("$a$")).toBe(false);
    expect(REGEXP.test("$-1$")).toBe(false);
    expect(REGEXP.test("$$")).toBe(false);
    expect(REGEXP.test("$1")).toBe(false);
    expect(REGEXP.test("1$")).toBe(false);
    expect(REGEXP.test("$01$")).toBe(true);
    expect(REGEXP.test("hello$1$world")).toBe(false);
    expect(REGEXP.test("")).toBe(false);
  });

  it("should extract the index from valid patterns", () => {
    const match1 = REGEXP.exec("$0$");
    expect(match1?.[1]).toBe("0");

    const match2 = REGEXP.exec("$42$");
    expect(match2?.[1]).toBe("42");
  });
});
