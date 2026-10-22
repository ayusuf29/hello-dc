export interface TimelineCursor {
  createdAt: string; // ISO string
  id: string; // UUID
}

/**
 * Encodes a sort tuple (createdAt, id) into an opaque base64 string.
 */
export function encodeCursor(cursor: TimelineCursor): string {
  const json = JSON.stringify(cursor);
  return Buffer.from(json, "utf-8").toString("base64url");
}

/**
 * Decodes an opaque base64 cursor string into a sort tuple.
 * Returns null if the cursor is invalid or malformed.
 */
export function decodeCursor(encodedCursor: string | null | undefined): TimelineCursor | null {
  if (!encodedCursor || typeof encodedCursor !== "string") {
    return null;
  }

  try {
    const json = Buffer.from(encodedCursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);

    if (
      parsed &&
      typeof parsed.createdAt === "string" &&
      typeof parsed.id === "string" &&
      !isNaN(Date.parse(parsed.createdAt))
    ) {
      return {
        createdAt: parsed.createdAt,
        id: parsed.id,
      };
    }
  } catch {
    return null;
  }

  return null;
}
