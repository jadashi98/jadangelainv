import { describe, expect, it } from "vitest";
import { effectiveLimit } from "./photo-rules";

describe("guest photo limit", () => {
  it("allows 25 photos by default", () => expect(effectiveLimit(undefined)).toBe(25));
  it("never exceeds 25 even if the setting is higher", () => expect(effectiveLimit(100)).toBe(25));
  it("respects a lower admin limit", () => expect(effectiveLimit(10)).toBe(10));
});
