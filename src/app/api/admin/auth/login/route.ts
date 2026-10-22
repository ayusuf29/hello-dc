import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminUsers, auditLogs } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/security/crypto";
import { createAdminSession } from "@/lib/auth/session";
import { logger } from "@/lib/security/logger";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(1, "Password tidak boleh kosong."),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Periksa kembali data yang dimasukkan.",
            requestId,
            fieldErrors: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const users = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase().trim()))
      .limit(1);

    if (users.length === 0) {
      logger.warn("Admin login attempt failed: user not found", { email, requestId });
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email atau kata sandi tidak cocok.",
            requestId,
          },
        },
        { status: 401 }
      );
    }

    const user = users[0];

    if (!user.isActive) {
      logger.warn("Admin login attempt blocked: account inactive", { email, requestId });
      return NextResponse.json(
        {
          error: {
            code: "ACCOUNT_INACTIVE",
            message: "Akun ini telah dinonaktifkan.",
            requestId,
          },
        },
        { status: 403 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      logger.warn("Admin login attempt failed: invalid password", { email, requestId });
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email atau kata sandi tidak cocok.",
            requestId,
          },
        },
        { status: 401 }
      );
    }

    await createAdminSession(user);

    // Audit log
    await db.insert(auditLogs).values({
      actorId: user.id,
      actorType: "admin_user",
      action: "admin_login",
      targetType: "admin_users",
      targetId: user.id,
      metadata: { email: user.email, role: user.role, requestId },
    });

    logger.info("Admin login successful", { email, role: user.role, requestId });

    return NextResponse.json({
      ok: true,
      admin: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error("Unexpected error in admin login", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
