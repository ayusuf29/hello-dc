"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error if needed
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Terjadi Gangguan</h2>
        <p className="text-xs text-slate-400">
          Gagal memuat bagian halaman ini. Silakan muat ulang atau coba beberapa saat lagi.
        </p>
        {error?.digest && (
          <p className="text-[11px] font-mono text-slate-500">Error Digest: {error.digest}</p>
        )}
        <div>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang Komponen</span>
          </button>
        </div>
      </div>
    </div>
  );
}
