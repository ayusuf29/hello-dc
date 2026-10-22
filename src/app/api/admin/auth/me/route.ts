import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";

export async function GET() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sesi tidak valid atau telah kedaluwarsa.",
        },
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    admin: {
      id: admin.id,
      email: admin.email,
      displayName: admin.displayName,
      role: admin.role,
    },
  });
}
