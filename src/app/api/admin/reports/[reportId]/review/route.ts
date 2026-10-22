import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reports, posts, auditLogs } from "@/lib/db/schema";
import { requireModeratorRole } from "@/lib/auth/guards";
import { logger } from "@/lib/security/logger";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject", "needs_info"]),
  moderatorNote: z.string().max(1000).optional(),
  title: z.string().max(250).optional(),
  summary: z.string().max(2000).optional(),
});

const REASON_TITLES: Record<string, string> = {
  doxing_ktp: "Penyebaran Foto KTP & Data Pribadi",
  kontak_darurat: "Intimidasi Kontak Darurat Tanpa Izin",
  teror_pesan: "Teror Pesan & Spam Berulang",
  intimidasi_lapangan: "Kekerasan / Ancaman DC Lapangan",
  pencemaran_nama_baik: "Pencemaran Nama Baik di Publik",
  lainnya: "Laporan Pelanggaran Etika Penagihan",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const admin = await requireModeratorRole();
    const { reportId } = await params;

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter peninjauan tidak valid.",
            requestId,
            fieldErrors: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { decision, moderatorNote, title, summary } = parsed.data;

    // Transactional review
    const result = await db.transaction(async (tx) => {
      // 1. Fetch report
      const [report] = await tx
        .select()
        .from(reports)
        .where(eq(reports.id, reportId))
        .limit(1);

      if (!report) {
        throw new Error("REPORT_NOT_FOUND");
      }

      const now = new Date();

      if (decision === "approve") {
        // 2. Check if post with canonicalUrl already exists
        const [existingPost] = await tx
          .select({ id: posts.id })
          .from(posts)
          .where(eq(posts.canonicalUrl, report.canonicalUrl))
          .limit(1);

        let finalPostId: string;

        if (existingPost) {
          finalPostId = existingPost.id;
          // Ensure it's published if it was archived
          await tx
            .update(posts)
            .set({ status: "published", updatedAt: now })
            .where(eq(posts.id, existingPost.id));
        } else {
          // Insert new published post
          const fallbackTitle =
            title ||
            REASON_TITLES[report.reason] ||
            "Laporan Penagihan DC Terverifikasi";
          const fallbackSummary =
            summary ||
            report.description ||
            `Laporan dugaan pelanggaran etika penagihan: ${REASON_TITLES[report.reason] || report.reason}.`;

          const [newPost] = await tx
            .insert(posts)
            .values({
              merchantId: report.merchantId,
              platform: report.platform,
              sourceUrl: report.sourceUrl,
              canonicalUrl: report.canonicalUrl,
              title: fallbackTitle,
              summary: fallbackSummary,
              status: "published",
              publishedAt: now,
            })
            .returning({ id: posts.id });

          finalPostId = newPost.id;
        }

        // 3. Mark report approved and link postId
        const [updatedReport] = await tx
          .update(reports)
          .set({
            status: "approved",
            postId: finalPostId,
            moderatorNote: moderatorNote || null,
            reviewedAt: now,
          })
          .where(eq(reports.id, reportId))
          .returning();

        // 4. Audit log
        await tx.insert(auditLogs).values({
          actorId: admin.id,
          actorType: "admin_user",
          action: "report_approve",
          targetType: "reports",
          targetId: reportId,
          metadata: { postId: finalPostId, decision, requestId },
        });

        return { report: updatedReport, postId: finalPostId };
      } else {
        // Reject or needs_info
        const [updatedReport] = await tx
          .update(reports)
          .set({
            status: decision === "reject" ? "rejected" : "needs_info",
            moderatorNote: moderatorNote || null,
            reviewedAt: now,
          })
          .where(eq(reports.id, reportId))
          .returning();

        await tx.insert(auditLogs).values({
          actorId: admin.id,
          actorType: "admin_user",
          action: decision === "reject" ? "report_reject" : "report_needs_info",
          targetType: "reports",
          targetId: reportId,
          metadata: { decision, moderatorNote, requestId },
        });

        return { report: updatedReport };
      }
    });

    logger.info("Report moderation completed", {
      adminId: admin.id,
      reportId,
      decision,
      requestId,
    });

    return NextResponse.json({
      ok: true,
      message:
        decision === "approve"
          ? "Laporan berhasil disetujui dan diterbitkan ke timeline publik."
          : decision === "reject"
          ? "Laporan telah ditolak."
          : "Status laporan diubah menjadi membutuhkan informasi tambahan.",
      ...result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REPORT_NOT_FOUND") {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Laporan tidak ditemukan.",
            requestId,
          },
        },
        { status: 404 }
      );
    }

    logger.error("Error reviewing report", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memproses peninjauan laporan.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
