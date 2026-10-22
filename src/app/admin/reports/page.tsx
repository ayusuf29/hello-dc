"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Inbox,
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Clock,
  Check,
  Building2,
  Loader2,
  X,
  FileText,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface AdminReportItem {
  id: string;
  platform: "x" | "threads";
  sourceUrl: string;
  canonicalUrl: string;
  reason: string;
  description: string | null;
  status: "pending" | "approved" | "rejected" | "needs_info";
  moderatorNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  postId: string | null;
  merchant: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  isDuplicate?: boolean;
  existingPost?: {
    id: string;
    canonicalUrl: string;
    status: string;
  } | null;
}

const REASON_LABELS: Record<string, string> = {
  doxing_ktp: "Penyebaran Foto KTP & Data Pribadi",
  kontak_darurat: "Intimidasi Kontak Darurat Tanpa Izin",
  teror_pesan: "Teror Pesan & Spam Berulang",
  intimidasi_lapangan: "Kekerasan / Ancaman DC Lapangan",
  pencemaran_nama_baik: "Pencemaran Nama Baik di Publik",
  lainnya: "Pelanggaran Etika Penagihan Lainnya",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "approved" | "rejected" | "needs_info" | "all"
  >("pending");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Review Modal State
  const [activeReport, setActiveReport] = useState<AdminReportItem | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | "needs_info">("approve");
  const [postTitle, setPostTitle] = useState("");
  const [postSummary, setPostSummary] = useState("");
  const [moderatorNote, setModeratorNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchReports = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    } else {
      params.set("status", "all");
    }
    if (search.trim()) {
      params.set("q", search.trim());
    }

    fetch(`/api/admin/reports?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setReports(data.items);
          setError(null);
        } else if (data.error) {
          setError(data.error.message);
        }
      })
      .catch(() => {
        setError("Gagal terhubung ke server untuk memuat laporan.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [statusFilter, search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Open modal and pre-fill form
  function handleOpenReview(item: AdminReportItem) {
    setActiveReport(item);
    setDecision("approve");
    const reasonText = REASON_LABELS[item.reason] || item.reason;
    setPostTitle(`${reasonText} — ${item.merchant.name}`);
    setPostSummary(item.description || `Laporan dugaan pelanggaran etika penagihan: ${reasonText}.`);
    setModeratorNote("");
    setReviewError(null);
  }

  function handleCloseModal() {
    setActiveReport(null);
    setReviewError(null);
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!activeReport) return;

    if ((decision === "reject" || decision === "needs_info") && !moderatorNote.trim()) {
      setReviewError("Catatan moderator wajib diisi untuk penolakan atau permintaan info tambahan.");
      return;
    }

    setIsSubmitting(true);
    setReviewError(null);

    try {
      const res = await fetch(`/api/admin/reports/${activeReport.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          moderatorNote: moderatorNote.trim() || undefined,
          title: decision === "approve" ? postTitle.trim() : undefined,
          summary: decision === "approve" ? postSummary.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal memproses peninjauan laporan.");
      }

      setSuccessToast(data.message || "Keputusan moderasi berhasil disimpan.");
      setTimeout(() => setSuccessToast(null), 4000);
      handleCloseModal();
      fetchReports();
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Antrean Moderasi Laporan
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {reports.length} laporan
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Verifikasi dan teliti laporan bukti pelanggaran doxing dari pelapor sebelum diterbitkan ke timeline publik.
          </p>
        </div>

        <button
          onClick={fetchReports}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-sm shadow-lg animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(
            [
              { key: "pending", label: "Menunggu Review", count: statusFilter === "pending" ? reports.length : undefined },
              { key: "approved", label: "Disetujui" },
              { key: "needs_info", label: "Butuh Info" },
              { key: "rejected", label: "Ditolak" },
              { key: "all", label: "Semua" },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                  isActive
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <span>{tab.label}</span>
                {tab.key === "pending" && pendingCount > 0 && statusFilter !== "pending" && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari URL, catatan, alasan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
          />
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
          <p className="text-sm text-slate-400">Memuat laporan dari database...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={fetchReports}
            className="mt-3 px-4 py-1.5 text-xs bg-rose-900/50 hover:bg-rose-800/60 text-white rounded-lg transition"
          >
            Coba Lagi
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8">
          <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">Tidak ada laporan</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {statusFilter === "pending"
              ? "Semua laporan yang masuk sudah selesai ditinjau. Tidak ada antrean pending."
              : `Tidak ditemukan laporan dengan filter status "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isPending = report.status === "pending";
            const isApproved = report.status === "approved";
            const isRejected = report.status === "rejected";
            const isNeedsInfo = report.status === "needs_info";

            return (
              <div
                key={report.id}
                className={`p-5 rounded-2xl border transition-all ${
                  report.isDuplicate
                    ? "bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-950/10"
                    : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Header row: Merchant & Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {report.merchant.logoUrl ? (
                        <Image
                          src={report.merchant.logoUrl}
                          alt={report.merchant.name}
                          width={36}
                          height={36}
                          className="w-full h-full object-contain p-1"
                          unoptimized
                        />
                      ) : (
                        <Building2 className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {report.merchant.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="capitalize font-medium text-slate-300">
                          {report.platform}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(report.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Menunggu Moderasi
                      </span>
                    )}
                    {isApproved && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" />
                        Disetujui
                      </span>
                    )}
                    {isRejected && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
                        <XCircle className="w-3 h-3" />
                        Ditolak
                      </span>
                    )}
                    {isNeedsInfo && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                        <HelpCircle className="w-3 h-3" />
                        Butuh Info
                      </span>
                    )}

                    {/* Action buttons */}
                    {(isPending || isNeedsInfo) && (
                      <button
                        onClick={() => handleOpenReview(report)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Tinjau Laporan</span>
                      </button>
                    )}

                    {isApproved && report.postId && (
                      <Link
                        href={`/admin/timeline`}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Lihat Post</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Duplicate Alert Banner */}
                {report.isDuplicate && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-amber-300 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <span className="font-semibold">Peringatan Duplikasi Konten: </span>
                      Canonical URL ini sudah pernah diterbitkan di timeline publik. Jika Anda menyetujui laporan ini, post yang sudah ada akan otomatis ditautkan atau diperbarui.
                    </div>
                  </div>
                )}

                {/* Report Body */}
                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Kategori Pelanggaran: </span>
                    <span className="text-rose-400 font-semibold">
                      {REASON_LABELS[report.reason] || report.reason}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">Tautan Bukti Publik: </span>
                    <a
                      href={report.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400 hover:underline break-all"
                    >
                      <span>{report.sourceUrl}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>

                  {report.description && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-300 leading-relaxed">
                      <span className="block text-slate-400 font-medium mb-1 text-[11px]">
                        Deskripsi / Keterangan Korban:
                      </span>
                      {report.description}
                    </div>
                  )}

                  {report.moderatorNote && (
                    <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-700/60 text-slate-300">
                      <span className="block text-amber-400 font-medium mb-1 text-[11px]">
                        Catatan Moderator ({report.reviewedAt ? new Date(report.reviewedAt).toLocaleDateString("id-ID") : ""}):
                      </span>
                      {report.moderatorNote}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review & Moderation Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Tinjau & Moderasi Laporan
                  </h3>
                  <p className="text-xs text-slate-400">
                    Merchant: <span className="text-white font-medium">{activeReport.merchant.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitReview} className="mt-5 space-y-5">
              {reviewError && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {reviewError}
                </div>
              )}

              {/* Source Info snippet */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Platform:</span>
                  <span className="capitalize font-semibold text-white">{activeReport.platform}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-400 flex-shrink-0">URL:</span>
                  <a
                    href={activeReport.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline break-all text-right inline-flex items-center gap-1"
                  >
                    <span>{activeReport.sourceUrl}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Alasan:</span>
                  <span className="text-rose-400 font-medium">
                    {REASON_LABELS[activeReport.reason] || activeReport.reason}
                  </span>
                </div>
                {activeReport.description && (
                  <div className="pt-2 border-t border-slate-800 text-slate-300">
                    <span className="text-slate-500 block mb-0.5">Deskripsi Korban:</span>
                    {activeReport.description}
                  </div>
                )}
              </div>

              {/* Decision Tabs */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Keputusan Moderasi
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecision("approve")}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                      decision === "approve"
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-400"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40"
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Setujui (Publikasi)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision("needs_info")}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                      decision === "needs_info"
                        ? "bg-blue-600/20 border-blue-500 text-blue-400"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40"
                    }`}
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>Butuh Info</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision("reject")}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                      decision === "reject"
                        ? "bg-rose-600/20 border-rose-500 text-rose-400"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40"
                    }`}
                  >
                    <XCircle className="w-5 h-5" />
                    <span>Tolak Laporan</span>
                  </button>
                </div>
              </div>

              {/* Conditional Form Fields based on decision */}
              {decision === "approve" && (
                <div className="space-y-4 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/40">
                  <div className="text-xs text-emerald-300 font-medium">
                    Postingan ini akan langsung diterbitkan secara transparan ke Timeline Publik. Anda dapat menyesuaikan judul dan rangkumannya di bawah ini:
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Judul Postingan Publik
                    </label>
                    <input
                      type="text"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="Judul postingan di timeline..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Rangkuman Pelanggaran Publik
                    </label>
                    <textarea
                      rows={3}
                      value={postSummary}
                      onChange={(e) => setPostSummary(e.target.value)}
                      placeholder="Ringkasan ringkas dan faktual..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Moderator Note Field */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Catatan Moderator {decision !== "approve" && <span className="text-rose-400">*</span>}
                  <span className="text-slate-500 font-normal ml-1">
                    {decision === "approve"
                      ? "(Opsional, catatan internal)"
                      : "(Wajib: jelaskan alasan penolakan atau kekurangan data)"}
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={moderatorNote}
                  onChange={(e) => setModeratorNote(e.target.value)}
                  placeholder={
                    decision === "reject"
                      ? "Contoh: Bukti URL bukan merupakan tindakan doxing atau tidak dapat diakses."
                      : decision === "needs_info"
                      ? "Contoh: Mohon sediakan tangkapan layar konteks ancaman penagihan yang lebih jelas."
                      : "Catatan internal jika diperlukan..."
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 text-xs font-medium rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2.5 text-xs font-semibold rounded-xl text-white shadow-lg transition flex items-center gap-2 ${
                    decision === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40"
                      : decision === "needs_info"
                      ? "bg-blue-600 hover:bg-blue-500 shadow-blue-950/40"
                      : "bg-rose-600 hover:bg-rose-500 shadow-rose-950/40"
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : decision === "approve" ? (
                    <Check className="w-4 h-4" />
                  ) : decision === "needs_info" ? (
                    <HelpCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>
                    {isSubmitting
                      ? "Memproses..."
                      : decision === "approve"
                      ? "Setujui & Publikasikan"
                      : decision === "needs_info"
                      ? "Simpan Butuh Info"
                      : "Tolak Laporan"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
