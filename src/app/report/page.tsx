import { redirect } from "next/navigation";
import { getCurrentReporterSession } from "@/lib/auth/reporter";
import { db } from "@/lib/db";
import { merchants } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { ReportForm } from "./ReportForm";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const session = await getCurrentReporterSession();

  if (!session) {
    redirect("/report/access");
  }

  // Load active merchants
  let activeMerchants: { id: string; name: string; slug: string; logoUrl: string | null }[] = [];
  try {
    activeMerchants = await db
      .select({
        id: merchants.id,
        name: merchants.name,
        slug: merchants.slug,
        logoUrl: merchants.logoUrl,
      })
      .from(merchants)
      .where(eq(merchants.isActive, true))
      .orderBy(asc(merchants.name));
  } catch {
    // fallback
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-rose-500 selection:text-white">
      <div className="max-w-2xl mx-auto">
        <ReportForm merchants={activeMerchants} />
      </div>
    </div>
  );
}
