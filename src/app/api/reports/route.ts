import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reports, merchants } from "@/lib/db/schema";
import { requireReporterAuth } from "@/lib/auth/reporter";
import { canonicalizeSocialUrl } from "@/lib/security/url";
import { logger } from "@/lib/security/logger";

const createReportSchema = z.object({
  merchantId: z.string().uuid("Pilih merchant yang valid."),
  sourceUrl: z.string().url("Format URL tidak valid."),
  reason: z.enum([
    "doxing_ktp",
    "kontak_darurat",
    "teror_pesan",
    "intimidasi_lapangan",
    "pencemaran_nama_baik",
    "lainnya",
  ]),
  description: z.string().max(2000, "Deskripsi maksimal 2000 karakter.").optional(),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // 1. Authorize reporter session
    const session = await requireReporterAuth();

    // 2. Parse and validate body
    const body = await request.json();
    const parsed = createReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Data laporan tidak lengkap atau format tidak sesuai.",
            requestId,
            fieldErrors: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { merchantId, sourceUrl, reason, description } = parsed.data;

    // 3. Verify merchant is active
    const [merchant] = await db
      .select({ id: merchants.id, isActive: merchants.isActive })
      .from(merchants)
      .where(eq(merchants.id, merchantId))
      .limit(1);

    if (!merchant || !merchant.isActive) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_MERCHANT",
            message: "Merchant yang dipilih tidak ditemukan atau sedang dinonaktifkan.",
            requestId,
          },
        },
        { status: 400 }
      );
    }

    // 4. Validate and canonicalize social media URL
    const urlCheck = canonicalizeSocialUrl(sourceUrl);
    if (!urlCheck.isValid || !urlCheck.canonicalUrl || !urlCheck.platform) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_URL",
            message: urlCheck.error || "Tautan bukti tidak valid.",
            requestId,
            fieldErrors: { sourceUrl: [urlCheck.error || "Tautan tidak valid"] },
          },
        },
        { status: 400 }
      );
    }

    // 5. Insert report into database (status: pending, private by default)
    const [created] = await db
      .insert(reports)
      .values({
        merchantId,
        inviteId: session.inviteId,
        platform: urlCheck.platform,
        sourceUrl,
        canonicalUrl: urlCheck.canonicalUrl,
        reason,
        description: description?.trim() || null,
        status: "pending",
      })
      .returning({
        id: reports.id,
        status: reports.status,
        createdAt: reports.createdAt,
      });

    logger.info("Report submitted successfully", {
      reportId: created.id,
      merchantId,
      canonicalUrl: urlCheck.canonicalUrl,
      requestId,
    });

    return NextResponse.json(
      {
        ok: true,
        report: created,
        message: "Laporan berhasil dikirim dan masuk ke antrean moderasi.",
      },
      { status: 201 }
    );
  } catch (error) {
    const isAuthError =
      error instanceof Error && error.message.includes("Sesi pelaporan");

    if (isAuthError) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Sesi pelaporan Anda telah berakhir. Silakan masukkan kode undangan kembali.",
            requestId,
          },
        },
        { status: 401 }
      );
    }

    logger.error("Error submitting report", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menyimpan laporan Anda. Silakan coba kembali.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
