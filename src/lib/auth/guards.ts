import "server-only";
import { getCurrentAdmin, type AuthenticatedAdmin } from "./session";

export class UnauthorizedError extends Error {
  constructor(message = "Autentikasi diperlukan.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Requires an active admin or moderator session.
 * Throws UnauthorizedError if not logged in.
 */
export async function requireAuth(): Promise<AuthenticatedAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new UnauthorizedError();
  }
  return admin;
}

/**
 * Requires an active session with role 'admin'.
 * Throws UnauthorizedError if not logged in, or ForbiddenError if role is only moderator.
 */
export async function requireAdminRole(): Promise<AuthenticatedAdmin> {
  const admin = await requireAuth();
  if (admin.role !== "admin") {
    throw new ForbiddenError("Hanya administrator yang dapat melakukan tindakan ini.");
  }
  return admin;
}

/**
 * Requires an active session with role 'admin' or 'moderator'.
 */
export async function requireModeratorRole(): Promise<AuthenticatedAdmin> {
  const admin = await requireAuth();
  if (admin.role !== "admin" && admin.role !== "moderator") {
    throw new ForbiddenError("Peran tidak valid untuk tindakan moderasi.");
  }
  return admin;
}
