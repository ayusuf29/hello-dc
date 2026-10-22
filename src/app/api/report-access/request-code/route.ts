import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { reportInvites, auditLogs } from "@/lib/db/schema";
import { hashToken } from "@/lib/security/crypto";
import {
  normalizeIndonesianPhoneNumber,
  sendWhatsAppInviteCode,
} from "@/lib/notifications/whatsapp";
import { logger } from "@/lib/security/logger";

const requestCodeSchema = z.object({
  phoneNumber: z.string().min(8, "Nomor WhatsApp terlalu pendek.").max(25),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = requestCodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Format nomor WhatsApp tidak valid.",
            requestId,
          },
        },
        { status: 400 }
      );
    }

    const { phoneNumber } = parsed.data;
    const phoneCheck = normalizeIndonesianPhoneNumber(phoneNumber);

    if (!phoneCheck.isValid || !phoneCheck.normalized) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_PHONE_NUMBER",
            message: phoneCheck.error || "Nomor WhatsApp tidak valid.",
            requestId,
          },
        },
        { status: 400 }
      );
    }

    const normalizedPhone = phoneCheck.normalized;

    // Rate Limiting: 1 request every 60 seconds per phone number
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const phoneCol = reportInvites.phoneNumber ?? sql`"report_invites"."phone_number"`;

    const recentRequests = await db
      .select({ id: reportInvites.id, createdAt: reportInvites.createdAt })
      .from(reportInvites)
      .where(
        and(
          eq(phoneCol, normalizedPhone),
          gt(reportInvites.createdAt, oneMinuteAgo)
        )
      )
      .limit(1);

    if (recentRequests.length > 0) {
      const remainingSeconds = Math.max(
        1,
        60 - Math.floor((Date.now() - new Date(recentRequests[0].createdAt).getTime()) / 1000)
      );

      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Mohon tunggu ${remainingSeconds} detik sebelum meminta kode baru melalui WhatsApp.`,
            requestId,
            retryAfter: remainingSeconds,
          },
        },
        { status: 429 }
      );
    }

    // Generate readable 6-digit verification code with WA- prefix
    const randomDigits = crypto.randomInt(100000, 999999).toString();
    const rawCode = `WA-${randomDigits}`;
    const codeHash = hashToken(rawCode);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save invite code to database
    const [invite] = await db
      .insert(reportInvites)
      .values({
        codeHash,
        code: rawCode,
        phoneNumber: normalizedPhone,
        label: `WhatsApp: ${phoneCheck.formattedDisplay || normalizedPhone}`,
        maxUses: 1,
        usedCount: 0,
        isActive: true,
        expiresAt,
      })
      .returning({ id: reportInvites.id });

    // Send WhatsApp Message
    const dispatchResult = await sendWhatsAppInviteCode({
      to: normalizedPhone,
      code: rawCode,
      expiresInMinutes: 15,
    });

    if (!dispatchResult.success) {
      logger.error("Failed to deliver WhatsApp OTP", dispatchResult.error, {
        phoneNumber: normalizedPhone,
        requestId,
      });

      return NextResponse.json(
        {
          error: {
            code: "DISPATCH_FAILED",
            message:
              dispatchResult.error ||
              "Gagal mengirimkan kode ke nomor WhatsApp. Pastikan nomor terdaftar di WhatsApp dan coba lagi.",
            requestId,
          },
        },
        { status: 502 }
      );
    }

    // Audit log
    await db.insert(auditLogs).values({
      actorId: invite.id,
      actorType: "reporter",
      action: "whatsapp_otp_requested",
      targetType: "report_invites",
      targetId: invite.id,
      metadata: {
        maskedPhone: phoneCheck.masked,
        isSimulated: dispatchResult.isSimulated ?? false,
        requestId,
      },
    });

    logger.info("WhatsApp invite OTP dispatched", {
      inviteId: invite.id,
      maskedPhone: phoneCheck.masked,
      requestId,
    });

    return NextResponse.json({
      ok: true,
      message: `Kode undangan telah dikirim ke WhatsApp ${phoneCheck.masked}. Masukkan kode tersebut untuk melanjutkan.`,
      maskedPhone: phoneCheck.masked,
      expiresInSeconds: 900,
      debugCode: process.env.NODE_ENV !== "production" ? rawCode : undefined,
    });
  } catch (error) {
    logger.error("Error processing WhatsApp OTP request", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memproses permintaan kode undangan WhatsApp.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
