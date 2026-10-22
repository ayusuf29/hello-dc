import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/lib/db";
import { reportInvites, auditLogs } from "@/lib/db/schema";
import { requireAdminRole } from "@/lib/auth/guards";
import { hashToken } from "@/lib/security/crypto";
import { logger } from "@/lib/security/logger";

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

export async function GET() {
  const requestId = crypto.randomUUID();

  try {
    await requireAdminRole();

    const items = await db
      .select({
        id: reportInvites.id,
        code: reportInvites.code,
        label: reportInvites.label,
        phoneNumber: reportInvites.phoneNumber,
        maxUses: reportInvites.maxUses,
        usedCount: reportInvites.usedCount,
        isActive: reportInvites.isActive,
        expiresAt: reportInvites.expiresAt,
        createdAt: reportInvites.createdAt,
      })
      .from(reportInvites)
      .orderBy(desc(reportInvites.createdAt));

    return NextResponse.json({ items });
  } catch (error) {
    logger.error("Error fetching admin invites", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memuat daftar kode undangan.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const admin = await requireAdminRole();

    const body = await request.json();
    const parsed = createInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Format parameter kode undangan tidak valid.",
            requestId,
            fieldErrors: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { label, customCode, maxUses, expiresInDays } = parsed.data;

    // Generate random code if customCode not provided
    const rawCode =
      customCode?.trim().toUpperCase() ||
      `INVITE-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const codeHash = hashToken(rawCode);

    // Check conflict
    const existing = await db
      .select({ id: reportInvites.id })
      .from(reportInvites)
      .where(eq(reportInvites.codeHash, codeHash))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Kode undangan tersebut sudah ada. Gunakan kode lain.",
            requestId,
          },
        },
        { status: 409 }
      );
    }

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const [created] = await db
      .insert(reportInvites)
      .values({
        codeHash,
        code: rawCode,
        label: label || `Kode Undangan ${rawCode.slice(0, 10)}`,
        maxUses,
        usedCount: 0,
        isActive: true,
        expiresAt,
      })
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorType: "admin_user",
      action: "invite_create",
      targetType: "report_invites",
      targetId: created.id,
      metadata: { label: created.label, maxUses, requestId },
    });

    logger.info("Admin created invite code", {
      adminId: admin.id,
      inviteId: created.id,
      requestId,
    });

    return NextResponse.json(
      {
        ok: true,
        rawCode, // Returned ONCE upon creation so admin can copy it!
        invite: created,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error creating invite code", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal membuat kode undangan.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
