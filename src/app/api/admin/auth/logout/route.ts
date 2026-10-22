import { NextResponse } from "next/server";
import { getCurrentAdmin, revokeCurrentAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { logger } from "@/lib/security/logger";

export async function POST() {
  const requestId = crypto.randomUUID();

  try {
    const admin = await getCurrentAdmin();

    if (admin) {
      await db.insert(auditLogs).values({
        actorId: admin.id,
        actorType: "admin_user",
        action: "admin_logout",
        targetType: "admin_users",
        targetId: admin.id,
        metadata: { email: admin.email, requestId },
      });
      logger.info("Admin logout", { email: admin.email, requestId });
    }

    await revokeCurrentAdminSession();

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Error during admin logout", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memproses logout.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
