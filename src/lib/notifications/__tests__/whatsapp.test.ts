import { describe, it, expect } from "vitest";
import {
  normalizeIndonesianPhoneNumber,
  sendWhatsAppInviteCode,
} from "../whatsapp";
import { hashToken } from "../../security/crypto";

describe("WhatsApp Notification & Phone Normalization", () => {
  describe("normalizeIndonesianPhoneNumber", () => {
    it("normalizes standard 08xx mobile numbers to 628xx", () => {
      const res = normalizeIndonesianPhoneNumber("081234567890");
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe("6281234567890");
      expect(res.masked).toBe("0812-****-7890");
    });

    it("normalizes international format +628xx", () => {
      const res = normalizeIndonesianPhoneNumber("+6281987654321");
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe("6281987654321");
    });

    it("normalizes numbers typed with raw 8 prefix (omitting 0 or +62)", () => {
      const res = normalizeIndonesianPhoneNumber("81234567890");
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe("6281234567890");
      expect(res.masked).toBe("0812-****-7890");
    });

    it("handles dashes, spaces, and dots gracefully", () => {
      const res = normalizeIndonesianPhoneNumber("0812 - 3456 . 7890");
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe("6281234567890");
    });

    it("normalizes number already starting with 628xx", () => {
      const res = normalizeIndonesianPhoneNumber("6285712345678");
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe("6285712345678");
    });

    it("rejects landline numbers (e.g. 021, 022)", () => {
      const res = normalizeIndonesianPhoneNumber("0217654321");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("tidak valid");
    });

    it("rejects non-Indonesian country codes", () => {
      const res = normalizeIndonesianPhoneNumber("+14155552671");
      expect(res.isValid).toBe(false);
    });

    it("rejects numbers that are too short", () => {
      const res = normalizeIndonesianPhoneNumber("08123");
      expect(res.isValid).toBe(false);
    });

    it("rejects empty strings or invalid input", () => {
      expect(normalizeIndonesianPhoneNumber("").isValid).toBe(false);
      expect(normalizeIndonesianPhoneNumber("abc").isValid).toBe(false);
    });
  });

  describe("sendWhatsAppInviteCode (Mock Provider)", () => {
    it("successfully simulates dispatch in mock mode", async () => {
      const res = await sendWhatsAppInviteCode({
        to: "6281234567890",
        code: "WA-839201",
        expiresInMinutes: 15,
      });

      expect(res.success).toBe(true);
      expect(res.isSimulated).toBe(true);
      expect(res.messageId).toBeDefined();
    });
  });

  describe("WhatsApp OTP Verification candidate matching", () => {
    it("matches hash regardless of WA- prefix", () => {
      const generatedCode = "WA-482915";
      const targetHash = hashToken(generatedCode);

      // Scenario A: User types WA-482915
      const inputA = "WA-482915";
      const hashA = hashToken(inputA.toUpperCase().replace(/\s+/g, ""));
      expect(hashA).toBe(targetHash);

      // Scenario B: User types 482915 (6 digits without WA-)
      const inputB = "482915";
      const candidateHashesB = [
        hashToken(inputB),
        hashToken(`WA-${inputB}`),
      ];
      expect(candidateHashesB).toContain(targetHash);

      // Scenario C: User types with spaces "wa 482915"
      const inputC = "wa 482915".toUpperCase().replace(/\s+/g, ""); // "WA482915"
      // Normalized:
      const cleanC = inputC.replace(/^WA-?/, "WA-");
      expect(hashToken(cleanC)).toBe(targetHash);
    });
  });
});
