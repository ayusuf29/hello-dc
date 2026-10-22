import { describe, it, expect } from "vitest";
import {
  generateSecureToken,
  hashToken,
  hashPassword,
  verifyPassword,
} from "../crypto";

describe("Crypto Security Utilities", () => {
  it("generates a 64-hex-character token by default", () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it("produces deterministic SHA-256 hash for identical inputs", () => {
    const input = "INVITE-CODE-TEST-123";
    const hash1 = hashToken(input);
    const hash2 = hashToken(input);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("produces different hashes for different inputs", () => {
    const hash1 = hashToken("CODE-A");
    const hash2 = hashToken("CODE-B");
    expect(hash1).not.toBe(hash2);
  });

  it("hashes and verifies passwords correctly", async () => {
    const password = "SuperSecretPassword123!";
    const hashed = await hashPassword(password);

    expect(hashed).not.toBe(password);
    expect(hashed.startsWith("$2")).toBe(true);

    const isMatch = await verifyPassword(password, hashed);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword("WrongPassword!", hashed);
    expect(isWrongMatch).toBe(false);
  });
});
