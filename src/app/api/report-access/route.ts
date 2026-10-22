import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { reportInvites } from "@/lib/db/schema";
import { hashToken } from "@/lib/security/crypto";
import { createReporterSession } from "@/lib/auth/reporter";
import { logger } from "@/lib/security/logger";

const redemptionSchema = z.object({
  inviteCode: z.string().min(3, "Kode undangan terlalu pendek.").max(100),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = redemptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Format kode undangan tidak valid.",
            requestId,
          },
        },
        { status: 400 }
      );
    }

    const { inviteCode } = parsed.data;
    const rawInput = inviteCode.trim().toUpperCase().replace(/\s+/g, "");
    const candidateHashes = [hashToken(rawInput)];

    if (/^\d{6}$/.test(rawInput)) {
      candidateHashes.push(hashToken(`WA-${rawInput}`));
    } else if (rawInput.startsWith("WA-")) {
      candidateHashes.push(hashToken(rawInput.slice(3)));
    }

    const now = new Date();

    // Atomic consumption under concurrency
    const updatedInvites = await db
      .update(reportInvites)
      .set({
        usedCount: sql`${reportInvites.usedCount} + 1`,
      })
      .where(
        and(
          inArray(reportInvites.codeHash, candidateHashes),
          eq(reportInvites.isActive, true),
          or(
            isNull(reportInvites.expiresAt),
            gt(reportInvites.expiresAt, now)
          ),
          sql`${reportInvites.usedCount} < ${reportInvites.maxUses}`
        )
      )
      .returning({
        id: reportInvites.id,
        label: reportInvites.label,
        usedCount: reportInvites.usedCount,
        maxUses: reportInvites.maxUses,
      });

    if (updatedInvites.length === 0) {
      logger.warn("Invite redemption failed", { requestId });
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INVITE",
            message: "Kode undangan tidak valid, telah kedaluwarsa, atau kuota penggunaan telah habis.",
            requestId,
          },
        },
        { status: 400 }
      );
    }

    const invite = updatedInvites[0];

    // Issue bounded session
    await createReporterSession(invite.id);

    logger.info("Invite code redeemed successfully", {
      inviteId: invite.id,
      label: invite.label,
      requestId,
    });

    return NextResponse.json({
      ok: true,
      message: "Kode undangan berhasil diverifikasi. Sesi pelaporan aktif.",
    });
  } catch (error) {
    logger.error("Error redeeming invite code", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memproses penukaran kode undangan.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
