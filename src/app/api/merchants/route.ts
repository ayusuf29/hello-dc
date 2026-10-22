import { NextResponse } from "next/server";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { merchants } from "@/lib/db/schema";
import { logger } from "@/lib/security/logger";

export async function GET() {
  try {
    const list = await db
      .select({
        id: merchants.id,
        name: merchants.name,
        slug: merchants.slug,
        description: merchants.description,
        logoUrl: merchants.logoUrl,
        isFeatured: merchants.isFeatured,
        featuredOrder: merchants.featuredOrder,
      })
      .from(merchants)
      .where(eq(merchants.isActive, true))
      .orderBy(
        desc(merchants.isFeatured),
        asc(merchants.featuredOrder),
        asc(merchants.name)
      );

    return NextResponse.json({
      items: list,
    });
  } catch (error) {
    logger.error("Failed to fetch public merchants", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memuat daftar merchant.",
        },
      },
      { status: 500 }
    );
  }
}
