"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  KeyRound,
  ArrowRight,
  Loader2,
  AlertCircle,
  Lock,
  Phone,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  Sparkles,
} from "lucide-react";

export default function ReportAccessPage() {
  const router = useRouter();

  // Mode: "phone_step" (Step 1) | "code_step" (Step 2) | "manual_code" (Direct code input)
  const [step, setStep] = useState<"phone_step" | "code_step" | "manual_code">("phone_step");

  // Form states
  const [phoneNumber, setPhoneNumber] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);

  // Status & timing
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Countdown timer effect for resend code
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Request Code via WhatsApp (Step 1)
  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/report-access/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Gagal mengirimkan kode ke WhatsApp.");
        if (data.error?.retryAfter) {
          setCooldownSeconds(data.error.retryAfter);
        }
        setIsLoading(false);
        return;
      }

      setMaskedPhone(data.maskedPhone || phoneNumber);
      setSuccessInfo(data.message || "Kode undangan telah dikirim ke WhatsApp Anda.");
      if (data.debugCode) {
        setDebugCode(data.debugCode);
      }
      setCooldownSeconds(60);
      setStep("code_step");
    } catch {
      setError("Gagal terhubung ke server. Periksa koneksi internet Anda.");
    } finally {
      setIsLoading(false);
    }
  }

  // Verify Code (Step 2 or Manual Mode)
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/report-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Kode undangan tidak valid.");
        setIsLoading(false);
        return;
      }

      // Success, reporter session cookie is set
      router.push("/report");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 selection:bg-rose-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-xl shadow-rose-950/50 mb-4 ring-1 ring-white/10">
            {step === "phone_step" ? (
              <Phone className="w-7 h-7" />
            ) : (
              <KeyRound className="w-7 h-7" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Akses Pelaporan Bukti
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            {step === "phone_step" &&
              "Masukkan nomor WhatsApp Anda untuk menerima kode undangan akses pelaporan."}
            {step === "code_step" &&
              "Masukkan kode undangan 6-karakter yang dikirimkan ke WhatsApp Anda."}
            {step === "manual_code" &&
              "Masukkan kode undangan yang Anda peroleh dari tim admin atau rujukan komunitas."}
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && step === "code_step" && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Dev Mode Debug Helper */}
          {debugCode && step === "code_step" && (
            <div className="mb-5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>Simulasi Kode Dev: <strong className="font-mono text-white">{debugCode}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setInviteCode(debugCode)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-[11px] transition"
              >
                Pakai Kode
              </button>
            </div>
          )}

          {/* STEP 1: Input Nomor WhatsApp */}
          {step === "phone_step" && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label
                  htmlFor="phoneNumber"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
                >
                  Nomor WhatsApp Aktif
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-xs font-mono font-medium">
                    🇮🇩 +62
                  </div>
                  <input
                    id="phoneNumber"
                    type="tel"
                    required
                    autoFocus
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="812-3456-7890"
                    className="w-full pl-16 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Contoh: 081234567890 atau 81234567890. Kode OTP akan dikirim langsung ke WhatsApp nomor ini.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !phoneNumber.trim()}
                className="w-full py-3 px-4 rounded-xl font-medium text-xs text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 shadow-lg shadow-rose-900/40 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengirimkan Kode WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    <span>Dapatkan Kode via WhatsApp</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("manual_code");
                  }}
                  className="text-xs text-slate-400 hover:text-white transition inline-flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Punya kode manual dari admin / komunitas?</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Verifikasi Kode WhatsApp */}
          {step === "code_step" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="text-slate-400">Penerima WhatsApp:</span>
                <span className="font-mono font-semibold text-rose-400">
                  {maskedPhone}
                </span>
              </div>

              <div>
                <label
                  htmlFor="verifyCode"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
                >
                  Kode Undangan WhatsApp
                </label>
                <input
                  id="verifyCode"
                  type="text"
                  required
                  autoFocus
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="WA-XXXXXX"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-center tracking-widest text-lg placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !inviteCode.trim()}
                className="w-full py-3 px-4 rounded-xl font-medium text-xs text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 shadow-lg shadow-rose-900/40 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Kode...</span>
                  </>
                ) : (
                  <>
                    <span>Verifikasi & Lanjut Lapor</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("phone_step");
                  }}
                  className="text-slate-400 hover:text-white transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Ganti Nomor</span>
                </button>

                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={cooldownSeconds > 0 || isLoading}
                  className="text-rose-400 hover:text-rose-300 disabled:text-slate-600 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>
                    {cooldownSeconds > 0
                      ? `Kirim Ulang (${cooldownSeconds}s)`
                      : "Kirim Ulang Kode"}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* MANUAL MODE: Masukkan Kode Manual */}
          {step === "manual_code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label
                  htmlFor="manualCodeInput"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
                >
                  Kode Undangan Manual
                </label>
                <input
                  id="manualCodeInput"
                  type="text"
                  required
                  autoFocus
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="INVITE-XXXX-XXXX"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-center tracking-widest text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !inviteCode.trim()}
                className="w-full py-3 px-4 rounded-xl font-medium text-xs text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 shadow-lg shadow-rose-900/40 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Kode...</span>
                  </>
                ) : (
                  <>
                    <span>Buka Form Pelaporan</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("phone_step");
                  }}
                  className="text-xs text-slate-400 hover:text-white transition inline-flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Belum punya kode? Minta via WhatsApp</span>
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2 text-center text-xs text-slate-500">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privasi Terlindungi</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Nomor WhatsApp hanya digunakan untuk verifikasi satu kali dan pencegahan bot spam. Data Anda tidak akan dibagikan atau dipublikasikan ke pihak mana pun.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-200 transition"
          >
            ← Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );
}
