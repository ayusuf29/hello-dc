import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, merchants, auditLogs } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/guards";
import { canonicalizeSocialUrl } from "@/lib/security/url";
import { logger } from "@/lib/security/logger";

const createPostSchema = z.object({
  merchantId: z.string().uuid("ID merchant tidak valid."),
  sourceUrl: z.string().url("Format URL sumber tidak valid."),
  title: z.string().max(250).optional(),
  summary: z.string().min(5, "Ringkasan minimal 5 karakter.").max(2000),
  status: z.enum(["published", "archived"]).default("published"),
});

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "published" | "archived" | null;
    const merchantId = searchParams.get("merchantId");
    const q = searchParams.get("q");

    const conditions = [];

    if (status) {
      conditions.push(eq(posts.status, status));
    }

    if (merchantId) {
      conditions.push(eq(posts.merchantId, merchantId));
    }

    if (q && q.trim().length > 0) {
      const term = `%${q.trim()}%`;
      conditions.push(or(ilike(posts.title, term), ilike(posts.summary, term))!);
    }

    const items = await db
      .select({
        id: posts.id,
        platform: posts.platform,
        sourceUrl: posts.sourceUrl,
        canonicalUrl: posts.canonicalUrl,
        title: posts.title,
        summary: posts.summary,
        publishedAt: posts.publishedAt,
        status: posts.status,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        merchant: {
          id: merchants.id,
          name: merchants.name,
          slug: merchants.slug,
          logoUrl: merchants.logoUrl,
        },
      })
      .from(posts)
      .innerJoin(merchants, eq(posts.merchantId, merchants.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(posts.createdAt))
      .limit(100);

    return NextResponse.json({ items });
  } catch (error) {
    logger.error("Error fetching admin posts", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memuat data postingan.",
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
    const admin = await requireAuth();

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Data postingan tidak valid.",
            requestId,
            fieldErrors: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Validate and canonicalize social URL
    const urlCheck = canonicalizeSocialUrl(data.sourceUrl);
    if (!urlCheck.isValid || !urlCheck.canonicalUrl || !urlCheck.platform) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_URL",
            message: urlCheck.error || "URL postingan tidak valid.",
            requestId,
            fieldErrors: { sourceUrl: [urlCheck.error || "URL tidak valid"] },
          },
        },
        { status: 400 }
      );
    }

    // Verify merchant exists
    const [merchant] = await db
      .select({ id: merchants.id })
      .from(merchants)
      .where(eq(merchants.id, data.merchantId))
      .limit(1);

    if (!merchant) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Merchant yang dipilih tidak ditemukan.",
            requestId,
          },
        },
        { status: 404 }
      );
    }

    // Check duplicate canonical URL
    const existingPost = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.canonicalUrl, urlCheck.canonicalUrl))
      .limit(1);

    if (existingPost.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Postingan dengan URL tersebut sudah terdaftar dalam sistem.",
            requestId,
          },
        },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(posts)
      .values({
        merchantId: data.merchantId,
        platform: urlCheck.platform,
        sourceUrl: data.sourceUrl,
        canonicalUrl: urlCheck.canonicalUrl,
        title: data.title || null,
        summary: data.summary,
        status: data.status,
      })
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorType: "admin_user",
      action: "post_create",
      targetType: "posts",
      targetId: created.id,
      metadata: { canonicalUrl: created.canonicalUrl, requestId },
    });

    logger.info("Admin created post", { adminId: admin.id, postId: created.id, requestId });

    return NextResponse.json({ ok: true, post: created }, { status: 201 });
  } catch (error) {
    logger.error("Error creating post", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menyimpan postingan.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
