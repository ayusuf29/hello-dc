"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <h2 className="text-xl font-bold text-white">Terjadi Kesalahan Sistem</h2>
          <p className="text-sm text-slate-400">
            Aplikasi mengalami kendala teknis saat memuat halaman.
          </p>
          {error?.digest && (
            <p className="text-xs font-mono text-slate-500">Error ID: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-xl transition"
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}
