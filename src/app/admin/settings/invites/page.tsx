"use client";

import { useState, useEffect, useCallback } from "react";
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  RefreshCw,
  Search,
  Layers,
  Edit2,
} from "lucide-react";

interface InviteItem {
  id: string;
  code?: string | null;
  label: string | null;
  phoneNumber?: string | null;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Success Reveal Modal (Shows raw code once)
  const [createdRawCode, setCreatedRawCode] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Edit Modal
  const [editingInvite, setEditingInvite] = useState<InviteItem | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editMaxUses, setEditMaxUses] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchInvites = useCallback(() => {
    fetch("/api/admin/invites")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setInvites(data.items);
          setError(null);
        } else if (data.error) {
          setError(data.error.message);
        }
      })
      .catch(() => {
        setError("Gagal terhubung ke server untuk memuat kode undangan.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  // Handle Create Invite
  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || undefined,
          customCode: customCode.trim() || undefined,
          maxUses: Number(maxUses),
          expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal membuat kode undangan.");
      }

      // Close create form and show reveal modal with raw code
      setIsCreateOpen(false);
      setCreatedRawCode(data.rawCode);
      setHasCopied(false);
      setLabel("");
      setCustomCode("");
      setMaxUses(1);
      setExpiresInDays("");
      fetchInvites();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Toggle Active/Revoke
  async function handleToggleActive(invite: InviteItem) {
    const nextState = !invite.isActive;
    const confirmMessage = nextState
      ? `Aktifkan kembali kode undangan "${invite.label || invite.id}"?`
      : `Cabut / nonaktifkan kode undangan "${invite.label || invite.id}"? Pelapor tidak akan bisa menggunakan kode ini lagi.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/admin/invites/${invite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextState }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal memperbarui status kode.");
      }

      setSuccessToast(
        nextState
          ? "Kode undangan berhasil diaktifkan kembali."
          : "Kode undangan berhasil dicabut."
      );
      setTimeout(() => setSuccessToast(null), 3000);
      fetchInvites();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui status.");
    }
  }

  // Handle Edit Invite
  function handleOpenEdit(invite: InviteItem) {
    setEditingInvite(invite);
    setEditLabel(invite.label || "");
    setEditMaxUses(invite.maxUses);
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingInvite) return;

    setIsEditing(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/admin/invites/${editingInvite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editLabel.trim() || undefined,
          maxUses: Number(editMaxUses),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal menyimpan perubahan.");
      }

      setEditingInvite(null);
      setSuccessToast("Kode undangan berhasil diperbarui.");
      setTimeout(() => setSuccessToast(null), 3000);
      fetchInvites();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsEditing(false);
    }
  }

  // Copy raw code to clipboard
  function handleCopyCode() {
    if (!createdRawCode) return;
    navigator.clipboard.writeText(createdRawCode);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);
  }

  function handleCopyRowCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Filtered list
  const filteredInvites = invites.filter((inv) => {
    const matchesSearch =
      (inv.label && inv.label.toLowerCase().includes(search.toLowerCase())) ||
      (inv.code && inv.code.toLowerCase().includes(search.toLowerCase())) ||
      (inv.phoneNumber && inv.phoneNumber.includes(search)) ||
      inv.id.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "active") {
      const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
      const isExhausted = inv.usedCount >= inv.maxUses;
      return inv.isActive && !isExpired && !isExhausted;
    }
    if (statusFilter === "inactive") {
      const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
      const isExhausted = inv.usedCount >= inv.maxUses;
      return !inv.isActive || isExpired || isExhausted;
    }
    return true;
  });

  const totalInvites = invites.length;
  const activeCount = invites.filter((inv) => {
    const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
    const isExhausted = inv.usedCount >= inv.maxUses;
    return inv.isActive && !isExpired && !isExhausted;
  }).length;
  const totalUses = invites.reduce((acc, curr) => acc + curr.usedCount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Manajemen Kode Undangan
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Akses Terbatas
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Buat, bagikan, dan pantau kode undangan sekali pakai atau multi-guna untuk pelapor bukti pelanggaran.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInvites}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kode Undangan</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-sm shadow-lg animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Kode Terdaftar</p>
            <p className="text-2xl font-bold text-white mt-1">{totalInvites}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <KeyRound className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Kode Masih Aktif</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Laporan Dikirim</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{totalUses}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1">
          {(
            [
              { key: "all", label: "Semua" },
              { key: "active", label: "Aktif" },
              { key: "inactive", label: "Habis / Dicabut" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                statusFilter === tab.key
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari label kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
          />
        </div>
      </div>

      {/* Invites Table */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
          <p className="text-sm text-slate-400">Memuat daftar kode undangan...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={fetchInvites}
            className="mt-3 px-4 py-1.5 text-xs bg-rose-900/50 hover:bg-rose-800/60 text-white rounded-lg transition"
          >
            Coba Lagi
          </button>
        </div>
      ) : filteredInvites.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8">
          <KeyRound className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">Tidak ada kode undangan</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? "Tidak ditemukan kode yang cocok dengan pencarian." : "Belum ada kode undangan yang dibuat."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Label & Sumber</th>
                  <th className="py-3.5 px-4">Kode Undangan</th>
                  <th className="py-3.5 px-4">Penggunaan</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Masa Berlaku</th>
                  <th className="py-3.5 px-4">Dibuat Pada</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredInvites.map((invite) => {
                  const isExpired =
                    invite.expiresAt && new Date(invite.expiresAt) < new Date();
                  const isExhausted = invite.usedCount >= invite.maxUses;
                  const isTrulyActive = invite.isActive && !isExpired && !isExhausted;

                  const usagePct = Math.min(
                    100,
                    Math.round((invite.usedCount / invite.maxUses) * 100)
                  );

                  return (
                    <tr
                      key={invite.id}
                      className="hover:bg-slate-850/40 transition group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                            <KeyRound className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>{invite.label || "Tanpa Label"}</span>
                              {invite.phoneNumber && (
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                                  WA: {invite.phoneNumber}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              ID: {invite.id.slice(0, 13)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {invite.code ? (
                          <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                            <code className="text-xs font-mono font-bold text-rose-400 px-2 py-0.5 select-all">
                              {invite.code}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopyRowCode(invite.code!, invite.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                              title="Salin Kode Undangan"
                            >
                              {copiedId === invite.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px] font-mono">
                            {invite.id.slice(0, 8)}...
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-w-[120px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-white">
                              {invite.usedCount}
                            </span>
                            <span className="text-slate-400">/ {invite.maxUses}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isExhausted
                                  ? "bg-amber-500"
                                  : isTrulyActive
                                  ? "bg-emerald-500"
                                  : "bg-slate-600"
                              }`}
                              style={{ width: `${usagePct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isTrulyActive && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Aktif
                          </span>
                        )}
                        {!invite.isActive && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" />
                            Dicabut
                          </span>
                        )}
                        {invite.isActive && isExhausted && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Habis (Maksimal)
                          </span>
                        )}
                        {invite.isActive && !isExhausted && isExpired && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-700/40 text-slate-400 border border-slate-700">
                            Kedaluwarsa
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {invite.expiresAt ? (
                          <span
                            className={
                              isExpired ? "text-rose-400 font-medium" : ""
                            }
                          >
                            {new Date(invite.expiresAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-500">Permanen</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(invite.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(invite)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Edit Label / Batas"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleActive(invite)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                              invite.isActive
                                ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                            }`}
                          >
                            {invite.isActive ? "Cabut Akses" : "Aktifkan"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Invite Code */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Buat Kode Undangan Baru
                  </h3>
                  <p className="text-xs text-slate-400">
                    Akses khusus untuk membuka formulir pelaporan bukti
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvite} className="mt-5 space-y-4">
              {createError && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Label / Referensi Penggunaan
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Contoh: Rujukan Komunitas Anti-Doxing, Korban Batch A"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Kode Kustom (Opsional)
                  <span className="text-slate-500 font-normal ml-1">
                    (Kosongkan jika ingin sistem men-generate kode acak otomatis)
                  </span>
                </label>
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: INVITE-KOMUNITAS-2026"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Maksimal Penggunaan
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={maxUses}
                    onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    1 = sekali pakai, &gt;1 = komunitas
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Masa Berlaku (Hari)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={expiresInDays}
                    onChange={(e) =>
                      setExpiresInDays(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Permanen (kosong)"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Kosong = tanpa batas waktu
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 text-xs font-medium rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? "Membuat..." : "Buat Kode"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reveal Raw Code Once */}
      {createdRawCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="font-bold text-lg text-white">
              Kode Undangan Berhasil Dibuat!
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Salin dan berikan kode ini kepada pelapor. Demi keamanan enkripsi data, kode mentah ini <strong className="text-emerald-400">hanya ditampilkan satu kali ini</strong>.
            </p>

            <div className="mt-5 p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between gap-3">
              <code className="text-base font-bold font-mono tracking-wider text-emerald-400 select-all break-all">
                {createdRawCode}
              </code>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition flex-shrink-0"
              >
                {hasCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setCreatedRawCode(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Saya Sudah Menyimpan Kode Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Invite */}
      {editingInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Edit Kode Undangan
                  </h3>
                  <p className="text-xs text-slate-400">
                    ID: {editingInvite.id.slice(0, 16)}...
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingInvite(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
              {editError && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {editError}
                </div>
              )}

              {editingInvite.code && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-0.5">Kode Undangan:</span>
                    <code className="text-sm font-mono font-bold text-rose-400 select-all">
                      {editingInvite.code}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyRowCode(editingInvite.code!, editingInvite.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition flex-shrink-0"
                  >
                    {copiedId === editingInvite.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Label
                </label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Maksimal Penggunaan
                </label>
                <input
                  type="number"
                  min={editingInvite.usedCount}
                  value={editMaxUses}
                  onChange={(e) => setEditMaxUses(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Sudah terpakai {editingInvite.usedCount} kali. Nilai tidak boleh lebih kecil dari ini.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingInvite(null)}
                  disabled={isEditing}
                  className="px-4 py-2.5 text-xs font-medium rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition flex items-center gap-2"
                >
                  {isEditing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isEditing ? "Menyimpan..." : "Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
