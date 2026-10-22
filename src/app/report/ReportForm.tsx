"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldAlert,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface MerchantSimple {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface ReportFormProps {
  merchants: MerchantSimple[];
}

const REASONS = [
  { id: "doxing_ktp", label: "Penyebaran Foto KTP & Data Pribadi" },
  { id: "kontak_darurat", label: "Intimidasi Kontak Darurat Tanpa Izin" },
  { id: "teror_pesan", label: "Teror Pesan WhatsApp / SMS Berulang" },
  { id: "intimidasi_lapangan", label: "Kekerasan / Ancaman DC Lapangan" },
  { id: "pencemaran_nama_baik", label: "Pencemaran Nama Baik di Medsos / Tempat Kerja" },
  { id: "lainnya", label: "Pelanggaran Etika Penagihan Lainnya" },
];

export function ReportForm({ merchants }: ReportFormProps) {
  const [merchantId, setMerchantId] = useState(merchants[0]?.id || "");
  const [sourceUrl, setSourceUrl] = useState("");
  const [reason, setReason] = useState("doxing_ktp");
  const [description, setDescription] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<{
    id: string;
    createdAt: string;
  } | null>(null);

  const selectedMerchant = merchants.find((m) => m.id === merchantId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          sourceUrl: sourceUrl.trim(),
          reason,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Gagal mengirimkan laporan.");
        setIsLoading(false);
        return;
      }

      setSubmittedReport(data.report);
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi internet Anda.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setSubmittedReport(null);
    setSourceUrl("");
    setDescription("");
    setError(null);
  }

  if (submittedReport) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase tracking-widest font-bold text-emerald-400">
            Laporan Berhasil Terkirim
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Terima Kasih Atas Pengaduan Anda
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Laporan Anda telah tercatat dengan aman dan masuk ke antrean verifikasi moderator.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-left text-xs space-y-2 max-w-md mx-auto">
          <div className="flex justify-between">
            <span className="text-slate-500">ID Laporan:</span>
            <span className="font-mono text-slate-300 select-all font-semibold">
              {submittedReport.id}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status Awal:</span>
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Menunggu Moderasi (Pending)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-400 text-left max-w-md mx-auto space-y-1">
          <p className="font-semibold text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            Mengapa laporan tidak langsung tayang?
          </p>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Demi menjaga integritas data dan mencegah penyebaran hoaks atau fitnah, setiap tautan bukti postingan diperiksa keabsahannya oleh tim kami sebelum diterbitkan ke timeline publik.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Kirim Laporan Kasus Lain
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/40 transition flex items-center justify-center gap-2"
          >
            <span>Buka Timeline Publik</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-3">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Sesi Pelaporan Aktif</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Kirimkan Bukti Penagihan Ilegal
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Laporkan tautan postingan X atau Threads yang mendokumentasikan pelanggaran debt collector.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Merchant Select */}
        <div>
          <label className="block font-semibold text-slate-300 mb-2 uppercase tracking-wider text-[11px]">
            1. Pilih Merchant / Pinjol Terkait *
          </label>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden p-1 flex-shrink-0">
              {selectedMerchant?.logoUrl ? (
                <Image
                  src={selectedMerchant.logoUrl}
                  alt={selectedMerchant.name}
                  width={36}
                  height={36}
                  className="object-contain w-full h-full"
                  unoptimized
                />
              ) : (
                <Building2 className="w-5 h-5 text-slate-600" />
              )}
            </div>
            <select
              required
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Source URL Input */}
        <div>
          <label className="block font-semibold text-slate-300 mb-2 uppercase tracking-wider text-[11px]">
            2. Tautan Postingan Sumber Asli (X atau Threads) *
          </label>
          <input
            type="url"
            required
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://x.com/username/status/123... atau https://threads.net/..."
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            Format yang didukung: Tautan postingan X/Twitter (<code>x.com/user/status/...</code>) atau tautan postingan Threads (<code>threads.net/@user/post/...</code> atau <code>/share/...</code>).
          </p>
        </div>

        {/* Category Reason */}
        <div>
          <label className="block font-semibold text-slate-300 mb-2 uppercase tracking-wider text-[11px]">
            3. Jenis Dugaan Pelanggaran *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {REASONS.map((r) => {
              const isSelected = reason === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReason(r.id)}
                  className={`p-3 rounded-xl border text-left text-xs transition ${
                    isSelected
                      ? "bg-rose-500/15 border-rose-500 text-white ring-1 ring-rose-500"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span className="font-medium">{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description / Context */}
        <div>
          <label className="block font-semibold text-slate-300 mb-2 uppercase tracking-wider text-[11px]">
            4. Ringkasan Kejadian / Catatan Tambahan (Opsional)
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tuliskan keterangan nomor penagih, jenis intimidasi, atau dampak yang dialami korban..."
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 leading-relaxed"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            ← Batal & Kembali
          </Link>

          <button
            type="submit"
            disabled={isLoading || !sourceUrl.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs shadow-lg shadow-rose-950/50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses Laporan...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim ke Tim Moderasi</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
