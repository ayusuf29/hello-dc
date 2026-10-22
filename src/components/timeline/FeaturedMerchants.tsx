"use client";

import Image from "next/image";
import { Building2, Sparkles } from "lucide-react";

export interface MerchantItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isFeatured: boolean;
  featuredOrder: number | null;
}

interface FeaturedMerchantsProps {
  merchants: MerchantItem[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
}

export function FeaturedMerchants({
  merchants,
  selectedSlug,
  onSelect,
}: FeaturedMerchantsProps) {
  const featured = merchants
    .filter((m) => m.isFeatured)
    .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99))
    .slice(0, 10);

  if (featured.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Merchant Terbanyak Dipantau
            </h2>
            <p className="text-xs text-slate-400">
              Pilih merchant untuk memfilter kronologi postingan
            </p>
          </div>
        </div>

        {selectedSlug && (
          <button
            onClick={() => onSelect(null)}
            className="text-xs font-medium text-rose-400 hover:text-rose-300 underline underline-offset-4 transition"
          >
            Tampilkan Semua
          </button>
        )}
      </div>

      {/* Grid of featured merchants (up to 10) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {featured.map((merchant) => {
          const isSelected = selectedSlug === merchant.slug;

          return (
            <button
              key={merchant.id}
              onClick={() => onSelect(isSelected ? null : merchant.slug)}
              className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col items-center justify-center text-center gap-2.5 relative group ${
                isSelected
                  ? "bg-rose-600/15 border-rose-500 text-white shadow-lg shadow-rose-950/40 ring-2 ring-rose-500/50"
                  : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center overflow-hidden p-1.5 shadow-inner">
                {merchant.logoUrl ? (
                  <Image
                    src={merchant.logoUrl}
                    alt={merchant.name}
                    width={48}
                    height={48}
                    className="object-contain w-full h-full"
                    unoptimized
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div className="w-full">
                <p className="font-semibold text-xs truncate text-white group-hover:text-rose-300 transition">
                  {merchant.name}
                </p>
                <span className="text-[10px] text-slate-400">
                  {isSelected ? "Filter Aktif" : "Lihat Kasus"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
