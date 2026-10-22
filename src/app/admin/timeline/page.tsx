"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Clock,
  Plus,
  Search,
  ExternalLink,
  Archive,
  RefreshCw,
  Building2,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface AdminPostItem {
  id: string;
  platform: "x" | "threads";
  sourceUrl: string;
  canonicalUrl: string;
  title: string | null;
  summary: string | null;
  publishedAt: string | null;
  status: "published" | "archived";
  createdAt: string;
  merchant: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
}

interface MerchantSimple {
  id: string;
  name: string;
}

export default function AdminTimelinePage() {
  const [posts, setPosts] = useState<AdminPostItem[]>([]);
  const [merchants, setMerchants] = useState<MerchantSimple[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "archived">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPosts = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("q", search.trim());

    fetch(`/api/admin/posts?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setPosts(data.items);
        } else if (data.error) {
          setError(data.error.message);
        }
      })
      .catch(() => {
        setError("Gagal terhubung ke server.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [statusFilter, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Load merchants for the dropdown
  useEffect(() => {
    async function loadMerchants() {
      try {
        const res = await fetch("/api/merchants");
        const data = await res.json();
        if (data.items) {
          setMerchants(data.items);
          if (data.items.length > 0) {
            setMerchantId(data.items[0].id);
          }
        }
      } catch {
        // Silently fail if merchants cannot be loaded yet
      }
    }
    loadMerchants();
  }, []);

  async function handleToggleArchive(post: AdminPostItem) {
    const nextStatus = post.status === "published" ? "archived" : "published";
    const actionLabel = nextStatus === "archived" ? "mengarsipkan" : "mempublikasikan kembali";

    if (!confirm(`Apakah Anda yakin ingin ${actionLabel} postingan ini?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        fetchPosts();
      }
    } catch {
      alert("Gagal mengubah status postingan.");
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          sourceUrl,
          title: title || undefined,
          summary,
          status: "published",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error?.message || "Gagal menambahkan postingan.");
        setIsSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      setSourceUrl("");
      setTitle("");
      setSummary("");
      fetchPosts();
    } catch {
      setFormError("Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Timeline & Postingan Publik
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Kelola arsip postingan yang tampil pada timeline publik.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-lg shadow-rose-950/40 transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Postingan Langsung</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul, ringkasan, atau nomor kasus..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Status:</span>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                statusFilter === "all" ? "bg-rose-600 text-white" : "text-slate-400"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter("published")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                statusFilter === "published" ? "bg-emerald-600 text-white" : "text-slate-400"
              }`}
            >
              Terpublikasi
            </button>
            <button
              onClick={() => setStatusFilter("archived")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                statusFilter === "archived" ? "bg-slate-800 text-white" : "text-slate-400"
              }`}
            >
              Diarsipkan
            </button>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
            <span>Memuat data postingan...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-400">{error}</div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Tidak ada postingan yang sesuai filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {posts.map((post) => {
              const isPublished = post.status === "published";
              return (
                <div
                  key={post.id}
                  className="p-4 sm:p-5 hover:bg-slate-800/30 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0 p-1">
                        {post.merchant.logoUrl ? (
                          <Image
                            src={post.merchant.logoUrl}
                            alt={post.merchant.name}
                            width={28}
                            height={28}
                            className="object-contain w-full h-full"
                            unoptimized
                          />
                        ) : (
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                      <span className="font-semibold text-white">
                        {post.merchant.name}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase">
                        {post.platform}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isPublished
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {isPublished ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" /> Publik
                          </>
                        ) : (
                          <>
                            <Archive className="w-2.5 h-2.5" /> Diarsipkan
                          </>
                        )}
                      </span>
                    </div>

                    {post.title && (
                      <h3 className="font-semibold text-sm text-slate-200">
                        {post.title}
                      </h3>
                    )}

                    <p className="text-slate-300 leading-relaxed max-w-3xl line-clamp-2">
                      {post.summary}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <span>Dibuat: {new Date(post.createdAt).toLocaleDateString("id-ID")}</span>
                      <a
                        href={post.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1"
                      >
                        <span>Buka Tautan Asli</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleArchive(post)}
                      className={`px-3 py-1.5 rounded-xl font-medium text-xs border transition flex items-center gap-1.5 ${
                        isPublished
                          ? "bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border-slate-700"
                          : "bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/40"
                      }`}
                    >
                      {isPublished ? (
                        <>
                          <Archive className="w-3.5 h-3.5" />
                          <span>Arsipkan</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Pulihkan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Tambah Post */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white mb-4">
              Tambah Postingan Publik Manual
            </h2>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Pilih Merchant Terkait *
                </label>
                <select
                  required
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Tautan Sumber Asli (X atau Threads) *
                </label>
                <input
                  type="url"
                  required
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://x.com/username/status/123456789 atau Threads"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  URL akan dinormalisasi dan divalidasi keunikannya di database.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Judul Singkat Kasus (Opsional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Ancaman sebar data KTP ke kontak darurat"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Ringkasan / Konteks Laporan *
                </label>
                <textarea
                  required
                  rows={4}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Uraikan kronologi, jenis ancaman, nomor pengirim, dan bukti yang diunggah korban..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publikasikan ke Timeline</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
