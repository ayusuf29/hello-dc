import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor } from "../cursor";

describe("Cursor Pagination Utility", () => {
  it("encodes and decodes valid sort tuples correctly", () => {
    const original = {
      createdAt: "2026-10-22T04:00:00.000Z",
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    };

    const encoded = encodeCursor(original);
    expect(typeof encoded).toBe("string");
    expect(encoded).not.toContain(" ");

    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual(original);
  });

  it("returns null for malformed or corrupted cursors", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("invalid-base64-string!@#$")).toBeNull();
    expect(decodeCursor(Buffer.from(JSON.stringify({ notA: "tuple" })).toString("base64url"))).toBeNull();
  });
});
