import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { requireAuth } from "@/lib/auth/guards";
import { logger } from "@/lib/security/logger";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

const EXTENSION_MAP: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const admin = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Berkas logo tidak ditemukan dalam permintaan.",
            requestId,
          },
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "Ukuran berkas logo melebihi batas maksimal 2MB.",
            requestId,
          },
        },
        { status: 413 }
      );
    }

    const mimeType = file.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Format gambar tidak didukung. Gunakan PNG, JPG, WebP, atau SVG.",
            requestId,
          },
        },
        { status: 415 }
      );
    }

    const ext = EXTENSION_MAP[mimeType] || ".png";
    const filename = `merchant-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "merchants");
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const logoUrl = `/uploads/merchants/${filename}`;

    logger.info("Merchant logo uploaded successfully", {
      adminId: admin.id,
      filename,
      sizeBytes: file.size,
      requestId,
    });

    return NextResponse.json({
      ok: true,
      logoUrl,
    });
  } catch (error) {
    logger.error("Failed to upload merchant logo", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menyimpan berkas logo.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
