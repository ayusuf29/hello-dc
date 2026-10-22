import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, or, ilike, lt, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, merchants } from "@/lib/db/schema";
import { decodeCursor, encodeCursor } from "@/lib/pagination/cursor";
import { logger } from "@/lib/security/logger";

const querySchema = z.object({
  merchant: z.string().max(180).optional(),
  platform: z.enum(["x", "threads"]).optional(),
  q: z.string().max(100).optional(),
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(50)),
});

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      merchant: searchParams.get("merchant") || undefined,
      platform: searchParams.get("platform") || undefined,
      q: searchParams.get("q") || undefined,
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter pencarian tidak valid.",
            requestId,
            fieldErrors: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { merchant, platform, q, cursor: rawCursor, limit } = parsed.data;

    const conditions = [
      eq(posts.status, "published"),
      eq(merchants.isActive, true),
    ];

    if (merchant) {
      conditions.push(eq(merchants.slug, merchant.toLowerCase().trim()));
    }

    if (platform) {
      conditions.push(eq(posts.platform, platform));
    }

    if (q && q.trim().length > 0) {
      const searchTerm = `%${q.trim()}%`;
      conditions.push(
        or(
          ilike(posts.title, searchTerm),
          ilike(posts.summary, searchTerm)
        )!
      );
    }

    // Cursor pagination (createdAt, id) < (cursorCreatedAt, cursorId)
    if (rawCursor) {
      const decoded = decodeCursor(rawCursor);
      if (decoded) {
        const cursorDate = new Date(decoded.createdAt);
        conditions.push(
          or(
            lt(posts.createdAt, cursorDate),
            and(
              eq(posts.createdAt, cursorDate),
              lt(posts.id, decoded.id)
            )
          )!
        );
      }
    }

    // Fetch limit + 1 items to see if there's a next page
    const rows = await db
      .select({
        id: posts.id,
        platform: posts.platform,
        sourceUrl: posts.sourceUrl,
        title: posts.title,
        summary: posts.summary,
        publishedAt: posts.publishedAt,
        createdAt: posts.createdAt,
        merchant: {
          name: merchants.name,
          slug: merchants.slug,
          logoUrl: merchants.logoUrl,
        },
      })
      .from(posts)
      .innerJoin(merchants, eq(posts.merchantId, merchants.id))
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor({
        createdAt: lastItem.createdAt.toISOString(),
        id: lastItem.id,
      });
    }

    return NextResponse.json({
      items,
      nextCursor,
    });
  } catch (error) {
    logger.error("Error fetching timeline posts", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memuat postingan timeline.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
