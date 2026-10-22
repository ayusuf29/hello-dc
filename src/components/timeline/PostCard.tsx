import Image from "next/image";
import { ExternalLink, Calendar, Building2 } from "lucide-react";

export interface TimelinePostItem {
  id: string;
  platform: "x" | "threads";
  sourceUrl: string;
  title: string | null;
  summary: string | null;
  publishedAt: string | null;
  createdAt: string;
  merchant: {
    name: string;
    slug: string;
    logoUrl: string | null;
  };
}

interface PostCardProps {
  post: TimelinePostItem;
  onSelectMerchant?: (slug: string) => void;
}

export function PostCard({ post, onSelectMerchant }: PostCardProps) {
  const isX = post.platform === "x";
  const displayDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );

  return (
    <article className="group relative rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 sm:p-6 hover:border-slate-700 hover:bg-slate-900 transition-all duration-200 shadow-lg shadow-black/20 flex flex-col justify-between">
      <div>
        {/* Header: Merchant Info & Platform Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={() => onSelectMerchant?.(post.merchant.slug)}
            className="flex items-center gap-3 text-left group/m focus:outline-none"
          >
            <div className="relative w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 overflow-hidden flex items-center justify-center flex-shrink-0 group-hover/m:ring-2 group-hover/m:ring-rose-500/40 transition">
              {post.merchant.logoUrl ? (
                <Image
                  src={post.merchant.logoUrl}
                  alt={post.merchant.name}
                  width={40}
                  height={40}
                  className="object-contain w-full h-full p-1"
                  unoptimized
                />
              ) : (
                <Building2 className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white group-hover/m:text-rose-400 transition">
                {post.merchant.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>{displayDate}</span>
              </div>
            </div>
          </button>

          {/* Platform Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
              isX
                ? "bg-slate-800 text-slate-200 border border-slate-700"
                : "bg-gradient-to-r from-purple-900/40 to-pink-900/40 text-pink-300 border border-pink-700/30"
            }`}
          >
            {isX ? (
              <span className="font-bold text-xs">𝕏 Post</span>
            ) : (
              <span className="font-bold text-xs">@ Threads</span>
            )}
          </span>
        </div>

        {/* Content */}
        {post.title && (
          <h4 className="font-medium text-sm text-slate-200 mb-2 leading-snug">
            {post.title}
          </h4>
        )}

        <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed line-clamp-4">
          {post.summary}
        </p>
      </div>

      {/* Footer: External Link */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          Bukti terverifikasi oleh moderator
        </span>

        <a
          href={post.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-rose-400 hover:text-rose-300 border border-slate-700/60 transition group-hover:border-slate-600"
        >
          <span>Lihat Sumber Asli</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </article>
  );
}
