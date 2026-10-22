import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  merchants,
  posts,
  reports,
  consultationTickets,
  auditLogs,
} from "@/lib/db/schema";
import { count, eq, desc } from "drizzle-orm";
import {
  Store,
  Clock,
  Inbox,
  MessageSquare,
  ShieldCheck,
  ArrowUpRight,
  Activity,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();

  // Load counts safely
  let merchantCount = 0;
  let postCount = 0;
  let pendingReportCount = 0;
  let openTicketCount = 0;
  let recentLogs: (typeof auditLogs.$inferSelect)[] = [];

  try {
    const [mRes] = await db.select({ val: count() }).from(merchants);
    merchantCount = mRes?.val ?? 0;

    const [pRes] = await db
      .select({ val: count() })
      .from(posts)
      .where(eq(posts.status, "published"));
    postCount = pRes?.val ?? 0;

    const [rRes] = await db
      .select({ val: count() })
      .from(reports)
      .where(eq(reports.status, "pending"));
    pendingReportCount = rRes?.val ?? 0;

    const [tRes] = await db
      .select({ val: count() })
      .from(consultationTickets)
      .where(eq(consultationTickets.status, "open"));
    openTicketCount = tRes?.val ?? 0;

    recentLogs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(5);
  } catch {
    // If DB is empty or unreachable during build
  }

  const stats = [
    {
      label: "Total Merchant",
      value: merchantCount,
      href: "/admin/merchants",
      icon: Store,
      color: "from-blue-500/20 to-indigo-500/10 text-indigo-400 border-indigo-500/20",
    },
    {
      label: "Post Terpublikasi",
      value: postCount,
      href: "/admin/timeline",
      icon: Clock,
      color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Laporan Pending",
      value: pendingReportCount,
      href: "/admin/reports",
      icon: Inbox,
      color: "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/20",
      highlight: pendingReportCount > 0,
    },
    {
      label: "Tiket Terbuka",
      value: openTicketCount,
      href: "/admin/consultations",
      icon: MessageSquare,
      color: "from-rose-500/20 to-pink-500/10 text-rose-400 border-rose-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sistem Operasional Aktif</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Selamat datang, {admin?.displayName || admin?.email}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Kelola merchant, verifikasi laporan masuk, pantau timeline publik, dan balas tiket konsultasi.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/reports"
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-lg shadow-rose-950/40 transition flex items-center gap-2"
            >
              <Inbox className="w-4 h-4" />
              <span>Buka Moderasi ({pendingReportCount})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className={`p-5 rounded-2xl bg-gradient-to-b ${s.color} border bg-slate-900/60 backdrop-blur-sm hover:border-slate-700 transition group`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">{s.label}</span>
                <div className="p-2 rounded-xl bg-slate-800/80 group-hover:scale-110 transition">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-white tracking-tight">
                  {s.value}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-0.5 group-hover:text-slate-300 transition">
                  Lihat <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick links */}
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">
            Aksi Cepat
          </h2>
          <div className="space-y-2.5">
            <Link
              href="/admin/merchants"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition"
            >
              <div className="flex items-center gap-3">
                <Store className="w-4 h-4 text-indigo-400" />
                <span>Tambah / Edit Merchant</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
            </Link>

            <Link
              href="/admin/timeline"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Kelola Post Publik</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
            </Link>

            {admin?.role === "admin" && (
              <Link
                href="/admin/settings/invites"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Buat Kode Undangan Baru</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            )}
          </div>
        </div>

        {/* Audit Log / Activity */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" />
              <span>Aktivitas Audit Terbaru</span>
            </h2>
          </div>

          {recentLogs.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Belum ada catatan aktivitas audit.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {recentLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-200">{log.action}</span>
                    <span className="text-slate-500 ml-2">
                      ({log.targetType})
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
