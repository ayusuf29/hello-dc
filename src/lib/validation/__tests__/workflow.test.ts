import { describe, it, expect } from "vitest";
import { z } from "zod";
import { hashToken } from "@/lib/security/crypto";
import { canonicalizeSocialUrl } from "@/lib/security/url";

// Test schema matching createInviteSchema
const createInviteSchema = z.object({
  label: z.string().max(150).optional(),
  customCode: z
    .string()
    .min(4)
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "Kode hanya boleh huruf, angka, tanda hubung, atau garis bawah.")
    .optional(),
  maxUses: z.number().int().min(1, "Minimal 1 penggunaan.").max(10000).default(1),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

// Test schema matching createReportSchema
const createReportSchema = z.object({
  merchantId: z.string().uuid("Pilih merchant yang valid."),
  sourceUrl: z.string().url("Format URL tidak valid."),
  reason: z.enum([
    "doxing_ktp",
    "kontak_darurat",
    "teror_pesan",
    "intimidasi_lapangan",
    "pencemaran_nama_baik",
    "lainnya",
  ]),
  description: z.string().max(2000, "Deskripsi maksimal 2000 karakter.").optional(),
});

// Test schema matching reviewSchema
const reviewSchema = z.object({
  decision: z.enum(["approve", "reject", "needs_info"]),
  moderatorNote: z.string().max(1000).optional(),
  title: z.string().max(250).optional(),
  summary: z.string().max(2000).optional(),
});

describe("Phase 3: Invite and Report Moderation Workflow Validation", () => {
  describe("Invite Code Generation & Hashing", () => {
    it("validates valid custom invite codes", () => {
      const validCodes = ["INVITE-2026", "BATCH_A", "KOMUNITAS-ANTI-DOX", "CODE123"];
      for (const code of validCodes) {
        const res = createInviteSchema.safeParse({ customCode: code, maxUses: 5 });
        expect(res.success).toBe(true);
      }
    });

    it("rejects invalid characters in custom invite codes", () => {
      const invalidCodes = ["INVITE CODE", "CODE@123", "CODE#SPECIAL", "A"]; // spaces, @, #, or too short
      for (const code of invalidCodes) {
        const res = createInviteSchema.safeParse({ customCode: code });
        expect(res.success).toBe(false);
      }
    });

    it("enforces maxUses lower and upper bounds", () => {
      expect(createInviteSchema.safeParse({ maxUses: 0 }).success).toBe(false);
      expect(createInviteSchema.safeParse({ maxUses: 10001 }).success).toBe(false);
      expect(createInviteSchema.safeParse({ maxUses: 1 }).success).toBe(true);
      expect(createInviteSchema.safeParse({ maxUses: 50 }).success).toBe(true);
    });

    it("produces deterministic SHA-256 hash for identical codes", () => {
      const code = "INVITE-COMMUNITY-2026";
      const hash1 = hashToken(code);
      const hash2 = hashToken(code);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces different hashes for different codes", () => {
      const hashA = hashToken("INVITE-A");
      const hashB = hashToken("INVITE-B");
      expect(hashA).not.toBe(hashB);
    });
  });

  describe("Report Submission Validation", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    it("accepts a well-formed report payload", () => {
      const valid = {
        merchantId: validUuid,
        sourceUrl: "https://x.com/korban/status/1234567890",
        reason: "doxing_ktp",
        description: "DC menyebarkan foto KTP di grup Facebook dan WhatsApp warga.",
      };
      const res = createReportSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("rejects invalid merchant UUIDs", () => {
      const invalid = {
        merchantId: "not-a-uuid",
        sourceUrl: "https://x.com/korban/status/1234567890",
        reason: "doxing_ktp",
      };
      const res = createReportSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });

    it("rejects unknown violation reasons", () => {
      const invalid = {
        merchantId: validUuid,
        sourceUrl: "https://x.com/korban/status/1234567890",
        reason: "spamming_ads", // Not in enum
      };
      const res = createReportSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });

    it("canonicalizes URLs and identifies duplicate canonical URLs correctly", () => {
      const url1 = "https://www.threads.com/share/G4e68SR0V";
      const url2 = "https://threads.net/share/G4e68SR0V?utm_source=app";

      const check1 = canonicalizeSocialUrl(url1);
      const check2 = canonicalizeSocialUrl(url2);

      expect(check1.isValid).toBe(true);
      expect(check2.isValid).toBe(true);
      // Both must resolve to the identical canonical URL
      expect(check1.canonicalUrl).toBe(check2.canonicalUrl);
      expect(check1.canonicalUrl).toBe("https://www.threads.net/share/G4e68SR0V");
    });
  });

  describe("Report Moderation Decision Validation", () => {
    it("accepts valid approve, reject, and needs_info decisions", () => {
      const approve = reviewSchema.safeParse({
        decision: "approve",
        title: "Penyebaran Foto KTP",
        summary: "Bukti validasi telah diverifikasi.",
      });
      expect(approve.success).toBe(true);

      const reject = reviewSchema.safeParse({
        decision: "reject",
        moderatorNote: "Tautan tidak menunjukkan bukti doxing.",
      });
      expect(reject.success).toBe(true);

      const needsInfo = reviewSchema.safeParse({
        decision: "needs_info",
        moderatorNote: "Mohon lampirkan konteks bukti tambahan.",
      });
      expect(needsInfo.success).toBe(true);
    });

    it("rejects invalid decisions", () => {
      const invalid = reviewSchema.safeParse({
        decision: "delete", // not allowed
      });
      expect(invalid.success).toBe(false);
    });
  });
});
