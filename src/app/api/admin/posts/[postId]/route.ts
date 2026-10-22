import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, auditLogs } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/guards";
import { logger } from "@/lib/security/logger";

const updatePostSchema = z.object({
  title: z.string().max(250).nullable().optional(),
  summary: z.string().min(5).max(2000).optional(),
  status: z.enum(["published", "archived"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const admin = await requireAuth();
    const { postId } = await params;

    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Data pembaruan postingan tidak valid.",
            requestId,
            fieldErrors: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Postingan tidak ditemukan.",
            requestId,
          },
        },
        { status: 404 }
      );
    }

    const data = parsed.data;

    const [updated] = await db
      .update(posts)
      .set({
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.summary !== undefined ? { summary: data.summary } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorType: "admin_user",
      action: "post_update",
      targetType: "posts",
      targetId: postId,
      metadata: { changes: data, requestId },
    });

    logger.info("Admin updated post", { adminId: admin.id, postId, requestId });

    return NextResponse.json({ ok: true, post: updated });
  } catch (error) {
    logger.error("Error updating post", error, { requestId });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal memperbarui postingan.",
          requestId,
        },
      },
      { status: 500 }
    );
  }
}
