import { cookies } from "next/headers";
import { eq, and, gt, isNull } from "drizzle-orm";
import { db } from "../db";
import { reporterSessions } from "../db/schema";
import { generateSecureToken, hashToken } from "../security/crypto";
import { REPORT_SESSION_COOKIE_NAME } from "./constants";

export const REPORTER_SESSION_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours

export interface AuthenticatedReporter {
  sessionId: string;
  inviteId: string;
  expiresAt: Date;
}

/**
 * Creates a new reporter session in database and sets the HttpOnly cookie.
 */
export async function createReporterSession(inviteId: string): Promise<string> {
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REPORTER_SESSION_DURATION_MS);

  await db.insert(reporterSessions).values({
    inviteId,
    tokenHash,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(REPORT_SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return rawToken;
}

/**
 * Retrieves the currently active reporter session from the cookie.
 * Returns null if missing, expired, or revoked.
 */
export async function getCurrentReporterSession(): Promise<AuthenticatedReporter | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(REPORT_SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const results = await db
    .select({
      id: reporterSessions.id,
      inviteId: reporterSessions.inviteId,
      expiresAt: reporterSessions.expiresAt,
    })
    .from(reporterSessions)
    .where(
      and(
        eq(reporterSessions.tokenHash, tokenHash),
        gt(reporterSessions.expiresAt, now),
        isNull(reporterSessions.revokedAt)
      )
    )
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const session = results[0];
  return {
    sessionId: session.id,
    inviteId: session.inviteId,
    expiresAt: session.expiresAt,
  };
}

/**
 * Requires an active reporter session, or throws an error.
 */
export async function requireReporterAuth(): Promise<AuthenticatedReporter> {
  const session = await getCurrentReporterSession();
  if (!session) {
    throw new Error("Sesi pelaporan tidak valid atau telah berakhir. Masukkan kode undangan kembali.");
  }
  return session;
}
