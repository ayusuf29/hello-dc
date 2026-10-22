import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, ne, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { merchants, auditLogs } from "@/lib/db/schema";
import { requireAdminRole } from "@/lib/auth/guards";
import { logger } from "@/lib/security/logger";

const updateMerchantSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  slug: z
    .string()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.")
    .optional(),
  description: z.string().max(1000).nullable().optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  featuredOrder: z.number().int().min(1).max(10).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const admin = await requireAdminRole();
    const { merchantId } = await params;

    const body = await request.json();
    const parsed = updateMerchantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Data pembaruan tidak valid.",
            requestId,
            fieldErrors: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, merchantId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Merchant tidak ditemukan.",
            requestId,
          },
        },
        { status: 404 }
      );
    }

    const data = parsed.data;

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existing.slug) {
      const slugConflict = await db
        .select({ id: merchants.id })
        .from(merchants)
        .where(and(eq(merchants.slug, data.slug), ne(merchants.id, merchantId)))
        .limit(1);

      if (slugConflict.length > 0) {
        return NextResponse.json(
          {
            error: {
              code: "CONFLICT",
              message: "Slug sudah digunakan oleh merchant lain.",
              requestId,
            },
          },
          { status: 409 }
        );
      }
    }

    // Check featured limit if turning on
    if (data.isFeatured === true && !existing.isFeatured) {
      const [featuredCount] = await db
        .select({ val: count() })
        .from(merchants)
        .where(eq(merchants.isFeatured, true));

      if ((featuredCount?.val ?? 0) >= 10) {
        return NextResponse.json(
          {
            error: {
              code: "FEATURED_LIMIT_EXCEEDED",
              message: "Maksimal 10 merchant unggulan telah tercapai.",
              requestId,
            },
          },
          { status: 400 }
        );
      }
    }

    const [updated] = await db
      .update(merchants)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.isFeatured !== undefined
          ? {
              isFeatured: data.isFeatured,
              featuredOrder: data.isFeatured ? data.featuredOrder ?? existing.featuredOrder : null,
            }
          : {}),
        ...(data.featuredOrder !== undefined && data.isFeatured !== false
          ? { featuredOrder: data.featuredOrder }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, merchantId))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorType: "admin_user",
      action: "merchant_update",
      targetType: "merchants",
      targetId: merchantId,
      metadata: { changes: data, requestId },
    });

    return NextResponse.json({ ok: true, merchant: updated });
  } catch (error) {
    logger.error("Error updating merchant", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memperbarui data merchant.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const admin = await requireAdminRole();
    const { merchantId } = await params;

    const [existing] = await db
      .select({ id: merchants.id, name: merchants.name })
      .from(merchants)
      .where(eq(merchants.id, merchantId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Merchant tidak ditemukan.",
            requestId,
          },
        },
        { status: 404 }
      );
    }

    // Soft delete / deactivate to preserve historical reports and posts
    const [updated] = await db
      .update(merchants)
      .set({
        isActive: false,
        isFeatured: false,
        featuredOrder: null,
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, merchantId))
      .returning();

    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorType: "admin_user",
      action: "merchant_deactivate",
      targetType: "merchants",
      targetId: merchantId,
      metadata: { name: existing.name, requestId },
    });

    logger.info("Merchant soft-deactivated", { adminId: admin.id, merchantId, requestId });

    return NextResponse.json({
      ok: true,
      message: "Merchant berhasil dinonaktifkan.",
      merchant: updated,
    });
  } catch (error) {
    logger.error("Error deactivating merchant", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menonaktifkan merchant.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
