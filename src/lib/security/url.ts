export type SupportedPlatform = "x" | "threads";

export interface CanonicalUrlResult {
  isValid: boolean;
  platform?: SupportedPlatform;
  canonicalUrl?: string;
  error?: string;
}

const X_HOSTNAMES = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
  "m.twitter.com",
]);

const THREADS_HOSTNAMES = new Set([
  "threads.net",
  "www.threads.net",
  "threads.com",
  "www.threads.com",
]);

/**
 * Validates and canonicalizes social media URLs for X and Threads.
 * Strips tracking parameters, enforces HTTPS, normalizes domains, and validates expected path shapes.
 */
export function canonicalizeSocialUrl(rawUrl: string): CanonicalUrlResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, error: "URL tidak boleh kosong." };
  }

  let parsed: URL;
  try {
    let toParse = rawUrl.trim();
    // Auto-prefix https:// if scheme is missing (e.g. threads.net/...)
    if (!toParse.startsWith("http://") && !toParse.startsWith("https://")) {
      toParse = `https://${toParse}`;
    }
    parsed = new URL(toParse);
  } catch {
    return { isValid: false, error: "Format URL tidak valid." };
  }

  // Enforce HTTPS
  if (parsed.protocol !== "https:") {
    return { isValid: false, error: "URL harus menggunakan protokol HTTPS." };
  }

  // Reject credentials in URL (e.g., https://user:pass@host)
  if (parsed.username || parsed.password) {
    return { isValid: false, error: "URL tidak boleh mengandung kredensial." };
  }

  // Reject unexpected ports
  if (parsed.port && parsed.port !== "443" && parsed.port !== "80") {
    return { isValid: false, error: "Port khusus tidak diizinkan." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Handle X / Twitter
  if (X_HOSTNAMES.has(hostname)) {
    const segments = parsed.pathname.split("/").filter(Boolean);

    // Format 1: /:username/status/:id
    if (segments.length >= 3 && segments[1].toLowerCase() === "status") {
      const username = segments[0].toLowerCase();
      const statusId = segments[2];
      if (/^\d+$/.test(statusId)) {
        return {
          isValid: true,
          platform: "x",
          canonicalUrl: `https://x.com/${username}/status/${statusId}`,
        };
      }
    }

    // Format 2: /i/web/status/:id or /i/status/:id
    if (segments.length >= 3 && segments[0].toLowerCase() === "i") {
      const lastSegment = segments[segments.length - 1];
      if (/^\d+$/.test(lastSegment)) {
        return {
          isValid: true,
          platform: "x",
          canonicalUrl: `https://x.com/i/status/${lastSegment}`,
        };
      }
    }

    return {
      isValid: false,
      error: "Tautan X harus berupa tautan postingan spesifik (contoh: https://x.com/username/status/123456789).",
    };
  }

  // Handle Threads (threads.net or threads.com)
  if (THREADS_HOSTNAMES.has(hostname)) {
    const segments = parsed.pathname.split("/").filter(Boolean);

    // Format 1: /@:username/post/:id or /:username/post/:id
    if (segments.length >= 3 && segments[1].toLowerCase() === "post") {
      const rawUser = segments[0].toLowerCase().replace(/^@/, "");
      const postId = segments[2];
      return {
        isValid: true,
        platform: "threads",
        canonicalUrl: `https://www.threads.net/@${rawUser}/post/${postId}`,
      };
    }

    // Format 2: /t/:id
    if (segments.length >= 2 && segments[0].toLowerCase() === "t") {
      const postId = segments[1];
      return {
        isValid: true,
        platform: "threads",
        canonicalUrl: `https://www.threads.net/t/${postId}`,
      };
    }

    // Format 3: /share/:id (Threads mobile share link, e.g. https://www.threads.com/share/G4e68SR0V)
    if (segments.length >= 2 && segments[0].toLowerCase() === "share") {
      const shareId = segments[1];
      return {
        isValid: true,
        platform: "threads",
        canonicalUrl: `https://www.threads.net/share/${shareId}`,
      };
    }

    return {
      isValid: false,
      error: "Tautan Threads harus berupa tautan postingan spesifik (contoh: https://www.threads.net/@username/post/xyz atau /share/xyz).",
    };
  }

  return {
    isValid: false,
    error: "Platform tidak didukung. Hanya tautan X (Twitter) dan Threads yang diizinkan.",
  };
}
