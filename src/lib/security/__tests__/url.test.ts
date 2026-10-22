import { describe, it, expect } from "vitest";
import { canonicalizeSocialUrl } from "../url";

describe("URL Canonicalization & Security", () => {
  describe("X (Twitter) URLs", () => {
    it("canonicalizes a standard x.com status link", () => {
      const result = canonicalizeSocialUrl("https://x.com/KorbanPinjol/status/1888291029102910");
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe("x");
      expect(result.canonicalUrl).toBe("https://x.com/korbanpinjol/status/1888291029102910");
    });

    it("normalizes twitter.com to x.com", () => {
      const result = canonicalizeSocialUrl("https://twitter.com/PengaduanDC/status/987654321");
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe("x");
      expect(result.canonicalUrl).toBe("https://x.com/pengaduandc/status/987654321");
    });

    it("strips tracking query parameters (?s=20, utm_source, etc.)", () => {
      const result = canonicalizeSocialUrl(
        "https://x.com/KasusDox/status/123456789?s=20&t=ABcDeFgHiJk&ref_src=twsrc%5Etfw"
      );
      expect(result.isValid).toBe(true);
      expect(result.canonicalUrl).toBe("https://x.com/kasusdox/status/123456789");
    });

    it("rejects non-numeric status IDs on X", () => {
      const result = canonicalizeSocialUrl("https://x.com/KasusDox/status/invalid-id");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("tautan postingan spesifik");
    });

    it("rejects generic profile links on X", () => {
      const result = canonicalizeSocialUrl("https://x.com/KasusDox");
      expect(result.isValid).toBe(false);
    });
  });

  describe("Threads URLs", () => {
    it("canonicalizes a standard @username/post/:id Threads link", () => {
      const result = canonicalizeSocialUrl("https://www.threads.net/@suarawarga/post/DFghjk1234");
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe("threads");
      expect(result.canonicalUrl).toBe("https://www.threads.net/@suarawarga/post/DFghjk1234");
    });

    it("canonicalizes a short /t/:id Threads link", () => {
      const result = canonicalizeSocialUrl("https://threads.net/t/C6abcd1234");
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe("threads");
      expect(result.canonicalUrl).toBe("https://www.threads.net/t/C6abcd1234");
    });

    it("canonicalizes a Threads share link with threads.com or threads.net", () => {
      const result = canonicalizeSocialUrl("https://www.threads.com/share/G4e68SR0V");
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe("threads");
      expect(result.canonicalUrl).toBe("https://www.threads.net/share/G4e68SR0V");

      const resultNet = canonicalizeSocialUrl("https://threads.net/share/G4e68SR0V?xmt=AQGz");
      expect(resultNet.isValid).toBe(true);
      expect(resultNet.canonicalUrl).toBe("https://www.threads.net/share/G4e68SR0V");
    });

    it("strips tracking parameters from Threads links", () => {
      const result = canonicalizeSocialUrl(
        "https://www.threads.net/@korban/post/DFghjk1234?igshid=MzRlODBiNWFlZA=="
      );
      expect(result.isValid).toBe(true);
      expect(result.canonicalUrl).toBe("https://www.threads.net/@korban/post/DFghjk1234");
    });
  });

  describe("Security constraints", () => {
    it("rejects plain HTTP protocol", () => {
      const result = canonicalizeSocialUrl("http://x.com/user/status/123456");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("HTTPS");
    });

    it("rejects URLs with embedded credentials", () => {
      const result = canonicalizeSocialUrl("https://admin:secret@x.com/user/status/123456");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("kredensial");
    });

    it("rejects unexpected ports", () => {
      const result = canonicalizeSocialUrl("https://x.com:8080/user/status/123456");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Port");
    });

    it("rejects unsupported platforms (e.g., TikTok, Instagram, FB)", () => {
      const result = canonicalizeSocialUrl("https://instagram.com/p/123456");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("tidak didukung");
    });

    it("rejects empty or malformed strings", () => {
      expect(canonicalizeSocialUrl("").isValid).toBe(false);
      expect(canonicalizeSocialUrl("not-a-url").isValid).toBe(false);
    });
  });
});
