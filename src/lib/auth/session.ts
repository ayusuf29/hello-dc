import "server-only";
import { cookies } from "next/headers";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db";
import { adminSessions, adminUsers, type AdminUser } from "../db/schema";
import { generateSecureToken, hashToken } from "../security/crypto";
import { ADMIN_SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "./constants";

export { ADMIN_SESSION_COOKIE_NAME, SESSION_DURATION_MS };

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  displayName: string | null;
  role: "admin" | "moderator";
  sessionId: string;
}

/**
 * Creates an admin session record in PostgreSQL and sets the HTTP-only cookie.
 */
export async function createAdminSession(adminUser: AdminUser): Promise<string> {
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(adminSessions).values({
    adminId: adminUser.id,
    tokenHash,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return rawToken;
}

/**
 * Retrieves the currently authenticated admin from the cookie, or null if invalid/expired.
 */
export async function getCurrentAdmin(): Promise<AuthenticatedAdmin | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const results = await db
    .select({
      sessionId: adminSessions.id,
      adminId: adminUsers.id,
      email: adminUsers.email,
      displayName: adminUsers.displayName,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
      expiresAt: adminSessions.expiresAt,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminId, adminUsers.id))
    .where(
      and(
        eq(adminSessions.tokenHash, tokenHash),
        gt(adminSessions.expiresAt, now),
        eq(adminUsers.isActive, true)
      )
    )
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const user = results[0];
  return {
    id: user.adminId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    sessionId: user.sessionId,
  };
}

/**
 * Revokes the current admin session and clears the cookie.
 */
export async function revokeCurrentAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
  }

  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
}
