"use client";

import { useState, useEffect } from "react";
import { Search, X, Loader2, ArrowDown, Clock } from "lucide-react";
import { PostCard, type TimelinePostItem } from "./PostCard";
import { FeaturedMerchants, type MerchantItem } from "./FeaturedMerchants";

interface TimelineFeedProps {
  initialMerchants: MerchantItem[];
}

export function TimelineFeed({ initialMerchants }: TimelineFeedProps) {
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"x" | "threads" | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [posts, setPosts] = useState<TimelinePostItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams();
    if (selectedMerchant) params.set("merchant", selectedMerchant);
    if (platform !== "all") params.set("platform", platform);
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    params.set("limit", "12");

    fetch(`/api/timeline?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          setPosts(data.items || []);
          setNextCursor(data.nextCursor || null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError("Gagal terhubung ke server.");
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedMerchant, platform, debouncedQuery, reloadKey]);

  async function handleLoadMore() {
    if (!nextCursor) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (selectedMerchant) params.set("merchant", selectedMerchant);
      if (platform !== "all") params.set("platform", platform);
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
      params.set("cursor", nextCursor);
      params.set("limit", "12");

      const res = await fetch(`/api/timeline?${params.toString()}`);
      const data = await res.json();
      if (data.items) {
        setPosts((prev) => [...prev, ...data.items]);
        setNextCursor(data.nextCursor || null);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingMore(false);
    }
  }

  const activeMerchantObj = initialMerchants.find((m) => m.slug === selectedMerchant);

  return (
    <div className="space-y-10">
      {/* 1. Featured Merchants Section */}
      <FeaturedMerchants
        merchants={initialMerchants}
        selectedSlug={selectedMerchant}
        onSelect={(slug) => {
          setSelectedMerchant(slug);
        }}
      />

      {/* 2. Filter Bar */}
      <div id="timeline-controls" className="space-y-4 pt-4 border-t border-slate-900">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kata kunci kasus, ancaman, atau nomor..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Platform Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setPlatform("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                platform === "all"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setPlatform("x")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                platform === "x"
                  ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              𝕏 Post
            </button>
            <button
              onClick={() => setPlatform("threads")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                platform === "threads"
                  ? "bg-purple-900/60 text-pink-300 border border-pink-700/50 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              @ Threads
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(selectedMerchant || platform !== "all" || debouncedQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-500">Filter Aktif:</span>
            {activeMerchantObj && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300">
                <span>Merchant: {activeMerchantObj.name}</span>
                <button
                  onClick={() => setSelectedMerchant(null)}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {platform !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                <span>Platform: {platform.toUpperCase()}</span>
                <button onClick={() => setPlatform("all")} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {debouncedQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                <span>Pencarian: &quot;{debouncedQuery}&quot;</span>
                <button onClick={() => setSearchQuery("")} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={() => {
                setSelectedMerchant(null);
                setPlatform("all");
                setSearchQuery("");
              }}
              className="text-slate-400 hover:text-rose-400 underline ml-1 text-xs"
            >
              Reset Semua
            </button>
          </div>
        )}
      </div>

      {/* 3. Posts Grid & States */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-slate-900/50 border border-slate-800/60 p-6 space-y-4 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-24 h-3.5 bg-slate-800 rounded" />
                    <div className="w-16 h-2.5 bg-slate-800/60 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-3 bg-slate-800 rounded" />
                  <div className="w-4/5 h-3 bg-slate-800 rounded" />
                  <div className="w-2/3 h-3 bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
            <p className="text-sm text-rose-300">{error}</p>
            <button
              onClick={() => {
                setIsLoading(true);
                setError(null);
                setReloadKey((k) => k + 1);
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition"
            >
              Coba Lagi
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="font-semibold text-base text-white">
                Tidak Ada Postingan Ditemukan
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Belum ada postingan terpublikasi yang cocok dengan kriteria pencarian atau filter yang dipilih.
              </p>
            </div>
            {(selectedMerchant || platform !== "all" || debouncedQuery) && (
              <button
                onClick={() => {
                  setSelectedMerchant(null);
                  setPlatform("all");
                  setSearchQuery("");
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Hapus Filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onSelectMerchant={(slug) => setSelectedMerchant(slug)}
                />
              ))}
            </div>

            {/* Load More Button */}
            {nextCursor && (
              <div className="text-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white font-medium text-xs shadow-lg transition inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memuat Postingan...</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-4 h-4" />
                      <span>Muat Lebih Banyak Postingan</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
