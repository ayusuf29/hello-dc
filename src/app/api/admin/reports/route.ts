import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and, or, ilike, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { reports, merchants, posts, type Report } from "@/lib/db/schema";
import { requireModeratorRole } from "@/lib/auth/guards";
import { logger } from "@/lib/security/logger";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    await requireModeratorRole();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as Report["status"] | "all" | null;
    const merchantId = searchParams.get("merchantId");
    const q = searchParams.get("q");

    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(reports.status, status));
    } else if (!status) {
      // Default to pending
      conditions.push(eq(reports.status, "pending"));
    }

    if (merchantId) {
      conditions.push(eq(reports.merchantId, merchantId));
    }

    if (q && q.trim().length > 0) {
      const term = `%${q.trim()}%`;
      conditions.push(
        or(
          ilike(reports.sourceUrl, term),
          ilike(reports.description, term),
          ilike(reports.reason, term)
        )!
      );
    }

    const items = await db
      .select({
        id: reports.id,
        platform: reports.platform,
        sourceUrl: reports.sourceUrl,
        canonicalUrl: reports.canonicalUrl,
        reason: reports.reason,
        description: reports.description,
        status: reports.status,
        moderatorNote: reports.moderatorNote,
        reviewedAt: reports.reviewedAt,
        createdAt: reports.createdAt,
        postId: reports.postId,
        merchant: {
          id: merchants.id,
          name: merchants.name,
          slug: merchants.slug,
          logoUrl: merchants.logoUrl,
        },
      })
      .from(reports)
      .innerJoin(merchants, eq(reports.merchantId, merchants.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reports.createdAt))
      .limit(100);

    // Duplicate detection: check if canonicalUrls already exist in posts or other reports
    const canonicalUrls = items.map((r) => r.canonicalUrl);
    const existingPosts = canonicalUrls.length > 0
      ? await db
          .select({ canonicalUrl: posts.canonicalUrl, id: posts.id, status: posts.status })
          .from(posts)
          .where(inArray(posts.canonicalUrl, canonicalUrls))
      : [];

    const postMap = new Map(existingPosts.map((p) => [p.canonicalUrl, p]));

    const enriched = items.map((item) => {
      const existingPost = postMap.get(item.canonicalUrl);
      return {
        ...item,
        isDuplicate: !!existingPost,
        existingPost: existingPost || null,
      };
    });

    return NextResponse.json({ items: enriched });
  } catch (error) {
    logger.error("Error fetching admin reports", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memuat antrean laporan.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
