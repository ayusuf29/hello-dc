import Link from "next/link";
import {
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileCheck,
  MessageSquareText,
  Lock,
} from "lucide-react";
import { db } from "@/lib/db";
import { merchants } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { TimelineFeed } from "@/components/timeline/TimelineFeed";
import type { MerchantItem } from "@/components/timeline/FeaturedMerchants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let activeMerchants: MerchantItem[] = [];

  try {
    const rows = await db
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

    activeMerchants = rows;
  } catch {
    // Graceful fallback if database is not reachable yet
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-950/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block leading-none">
                Lawan Doxing
              </span>
              <span className="text-[10px] text-slate-400 leading-none">
                Dokumentasi & Advokasi
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/report"
              className="text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 rounded-xl shadow-md transition"
            >
              Laporkan Bukti
            </Link>
            <Link
              href="/admin"
              className="text-xs font-medium text-slate-400 hover:text-white px-3.5 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-900 transition"
            >
              Portal Petugas
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="relative overflow-hidden pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-rose-600/10 rounded-full blur-[140px]" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[300px] bg-amber-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold tracking-wide">
            <ShieldCheck className="w-4 h-4" />
            <span>Pusat Informasi & Rekam Jejak Penagihan Debt Collector</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.18]">
            Pantau Riwayat & Lawan Praktik{" "}
            <span className="bg-gradient-to-r from-rose-400 via-rose-500 to-amber-400 bg-clip-text text-transparent">
              Doxing Ilegal
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed">
            Telusuri postingan terverifikasi dari media sosial (X & Threads) terkait ancaman, penyebaran data pribadi, dan intimidasi lapangan oleh merchant/pinjol tidak beretika.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/report"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-medium text-xs shadow-lg shadow-rose-950/40 transition flex items-center gap-2"
            >
              <span>Laporkan Kasus Penagihan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <a
              href="#timeline-section"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-medium text-xs transition flex items-center gap-2"
            >
              <span>Telusuri Timeline Kasus</span>
            </a>
          </div>
        </div>
      </section>

      {/* Main Interactive Timeline Section */}
      <section id="timeline-section" className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1">
        <TimelineFeed initialMerchants={activeMerchants} />
      </section>

      {/* Pillars Section */}
      <section className="py-16 border-t border-slate-900 bg-slate-950/70 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Prinsip Perlindungan Korban & Transparansi
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              Sistem dibangun untuk melindungi keamanan saksi dan menegakkan keakuratan data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-white">Kode Undangan Terbatas</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pelapor tidak diwajibkan membuat akun permanen untuk mencegah kebocoran identitas korban.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-white">Verifikasi Moderator</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Laporan tidak langsung terbit publik. Moderator memverifikasi keabsahan bukti terlebih dahulu.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <MessageSquareText className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-white">Konsultasi Privat</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Layanan pendampingan asinkron berbasis token rahasia untuk perlindungan dan panduan hukum.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Lawan Doxing Platform. Advokasi Hak Digital Korban Penagihan Ilegal.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>16 Merchant & Public Timeline Aktif</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
