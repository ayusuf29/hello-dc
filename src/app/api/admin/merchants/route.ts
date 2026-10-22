import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc, asc, ilike, and, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { merchants, auditLogs } from "@/lib/db/schema";
import { requireAuth, requireAdminRole } from "@/lib/auth/guards";
import { logger } from "@/lib/security/logger";

const createMerchantSchema = z.object({
  name: z.string().min(2, "Nama merchant minimal 2 karakter.").max(150),
  slug: z
    .string()
    .min(2, "Slug minimal 2 karakter.")
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung."),
  description: z.string().max(1000).optional(),
  logoUrl: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  featuredOrder: z.number().int().min(1).max(10).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const status = searchParams.get("status");

    const conditions = [];

    if (q && q.trim().length > 0) {
      conditions.push(ilike(merchants.name, `%${q.trim()}%`));
    }

    if (status === "active") {
      conditions.push(eq(merchants.isActive, true));
    } else if (status === "inactive") {
      conditions.push(eq(merchants.isActive, false));
    }

    const list = await db
      .select()
      .from(merchants)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        desc(merchants.isFeatured),
        asc(merchants.featuredOrder),
        asc(merchants.name)
      );

    return NextResponse.json({ items: list });
  } catch (error) {
    logger.error("Error fetching admin merchants", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memuat daftar merchant.",
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
    const parsed = createMerchantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Periksa kembali data merchant yang Anda kirimkan.",
            requestId,
            fieldErrors: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check slug uniqueness
    const existing = await db
      .select({ id: merchants.id })
      .from(merchants)
      .where(eq(merchants.slug, data.slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Slug merchant sudah digunakan. Silakan gunakan slug lain.",
            requestId,
            fieldErrors: { slug: ["Slug sudah digunakan."] },
          },
        },
        { status: 409 }
      );
    }

    // Check featured count constraint (max 10)
    if (data.isFeatured) {
      const [featuredCount] = await db
        .select({ val: count() })
        .from(merchants)
        .where(eq(merchants.isFeatured, true));

      if ((featuredCount?.val ?? 0) >= 10) {
        return NextResponse.json(
          {
            error: {
              code: "FEATURED_LIMIT_EXCEEDED",
              message: "Maksimal 10 merchant dapat dijadikan merchant unggulan. Hapus status unggulan pada merchant lain terlebih dahulu.",
              requestId,
            },
          },
          { status: 400 }
        );
      }
    }

    const [created] = await db
      .insert(merchants)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        logoUrl: data.logoUrl || null,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        featuredOrder: data.isFeatured ? data.featuredOrder || null : null,
      })
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorType: "admin_user",
      action: "merchant_create",
      targetType: "merchants",
      targetId: created.id,
      metadata: { name: created.name, slug: created.slug, requestId },
    });

    logger.info("Merchant created", { adminId: admin.id, merchantId: created.id, requestId });

    return NextResponse.json({ ok: true, merchant: created }, { status: 201 });
  } catch (error) {
    logger.error("Error creating merchant", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal membuat data merchant.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
