"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Store,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  Sparkles,
  Upload,
  Loader2,
  X,
  AlertCircle,
  Edit2,
  EyeOff,
} from "lucide-react";

interface MerchantData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  featuredOrder: number | null;
  createdAt: string;
}

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<MerchantData[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<MerchantData | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState<number | "">("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchMerchants = useCallback(() => {
    fetch("/api/admin/merchants")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setMerchants(data.items);
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
  }, []);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  function openCreateModal() {
    setEditingMerchant(null);
    setName("");
    setSlug("");
    setDescription("");
    setLogoUrl("");
    setIsActive(true);
    setIsFeatured(false);
    setFeaturedOrder("");
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(m: MerchantData) {
    setEditingMerchant(m);
    setName(m.name);
    setSlug(m.slug);
    setDescription(m.description || "");
    setLogoUrl(m.logoUrl || "");
    setIsActive(m.isActive);
    setIsFeatured(m.isFeatured);
    setFeaturedOrder(m.featuredOrder ?? "");
    setFormError(null);
    setIsModalOpen(true);
  }

  // Handle local logo file upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/merchants/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error?.message || "Gagal mengunggah logo.");
        return;
      }

      setLogoUrl(data.logoUrl);
    } catch {
      setFormError("Gagal menghubungi server saat upload gambar.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  // Auto-generate slug when typing name in create mode
  function handleNameChange(val: string) {
    setName(val);
    if (!editingMerchant) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      name,
      slug,
      description: description || null,
      logoUrl: logoUrl || null,
      isActive,
      isFeatured,
      featuredOrder: isFeatured && featuredOrder !== "" ? Number(featuredOrder) : null,
    };

    try {
      const url = editingMerchant
        ? `/api/admin/merchants/${editingMerchant.id}`
        : "/api/admin/merchants";
      const method = editingMerchant ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error?.message || "Gagal menyimpan merchant.");
        setIsSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      fetchMerchants();
    } catch {
      setFormError("Gagal menyimpan data ke server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Nonaktifkan merchant ini? Merchant tidak akan muncul di timeline publik.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/merchants/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchMerchants();
      }
    } catch {
      alert("Gagal menonaktifkan merchant.");
    }
  }

  const filtered = merchants.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Manajemen Merchant
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Kelola merchant, logo lokal, status aktif, dan daftar 10 merchant unggulan.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-lg shadow-rose-950/40 transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Merchant</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari merchant atau slug..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>Total: <strong className="text-white">{merchants.length}</strong></span>
          <span>Unggulan: <strong className="text-amber-400">{merchants.filter((m) => m.isFeatured).length}/10</strong></span>
        </div>
      </div>

      {/* Merchant Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
            <span>Memuat data merchant...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Tidak ada merchant yang cocok dengan pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Merchant</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Unggulan</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 overflow-hidden flex items-center justify-center flex-shrink-0 p-1">
                          {m.logoUrl ? (
                            <Image
                              src={m.logoUrl}
                              alt={m.name}
                              width={36}
                              height={36}
                              className="object-contain w-full h-full"
                              unoptimized
                            />
                          ) : (
                            <Building2 className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{m.name}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">
                            {m.description || "Tanpa deskripsi"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {m.slug}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {m.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {m.isFeatured ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          <Sparkles className="w-3 h-3" />
                          #{m.featuredOrder || "-"}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(m)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Edit Merchant"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {m.isActive && (
                          <button
                            onClick={() => handleDeactivate(m.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition"
                            title="Nonaktifkan Merchant"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
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
              {editingMerchant ? "Edit Merchant" : "Tambah Merchant Baru"}
            </h2>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nama Merchant *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Contoh: AdaKami"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Slug URL * (Hanya huruf kecil, angka, dan tanda hubung)
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
                  placeholder="adakami"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Deskripsi / Keterangan Kasus
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan singkat mengenai layanan pinjaman atau laporan penagihan..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Logo Upload Section (Saved Locally) */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Logo Merchant (Tersimpan di Penyimpanan Lokal)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-1 flex-shrink-0">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt="Preview"
                        width={48}
                        height={48}
                        className="object-contain w-full h-full"
                        unoptimized
                      />
                    ) : (
                      <Building2 className="w-5 h-5 text-slate-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-rose-400" />
                          <span>Pilih File Gambar (PNG/JPG)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploadingLogo}
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1">
                      File disimpan otomatis ke folder lokal <code>public/uploads/merchants/</code>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Featured toggle & order */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-200 block">
                      Merchant Unggulan (Maks. 10)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Tampilkan di grid showcase halaman depan.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
                  />
                </div>

                {isFeatured && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Urutan Tampil (1 – 10)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={featuredOrder}
                      onChange={(e) =>
                        setFeaturedOrder(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="1"
                      className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Status Aktif */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div>
                  <span className="font-semibold text-slate-200 block">Status Aktif</span>
                  <span className="text-[11px] text-slate-400">
                    Hanya merchant aktif yang muncul dalam filter laporan publik.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
                />
              </div>

              {/* Action Buttons */}
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
                  disabled={isSubmitting || isUploadingLogo}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingMerchant ? "Simpan Perubahan" : "Buat Merchant"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
