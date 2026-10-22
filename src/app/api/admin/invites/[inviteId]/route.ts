import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reportInvites, auditLogs } from "@/lib/db/schema";
import { requireAdminRole } from "@/lib/auth/guards";
import { logger } from "@/lib/security/logger";

const updateInviteSchema = z.object({
  label: z.string().max(150).optional(),
  isActive: z.boolean().optional(),
  maxUses: z.number().int().min(1).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const admin = await requireAdminRole();
    const { inviteId } = await params;

    const body = await request.json();
    const parsed = updateInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Format pembaruan tidak valid.",
            requestId,
          },
        },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(reportInvites)
      .where(eq(reportInvites.id, inviteId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Kode undangan tidak ditemukan.",
            requestId,
          },
        },
        { status: 404 }
      );
    }

    const data = parsed.data;

    const [updated] = await db
      .update(reportInvites)
      .set({
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.maxUses !== undefined ? { maxUses: data.maxUses } : {}),
      })
      .where(eq(reportInvites.id, inviteId))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorType: "admin_user",
      action: data.isActive === false ? "invite_revoke" : "invite_update",
      targetType: "report_invites",
      targetId: inviteId,
      metadata: { changes: data, requestId },
    });

    logger.info("Admin updated invite", { adminId: admin.id, inviteId, requestId });

    return NextResponse.json({ ok: true, invite: updated });
  } catch (error) {
    logger.error("Error updating invite", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memperbarui kode undangan.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
