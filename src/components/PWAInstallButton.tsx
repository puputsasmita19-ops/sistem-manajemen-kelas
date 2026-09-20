import React, { useState } from 'react';
import { Download, Smartphone, ArrowLeft } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-xl bg-blue-600 dark:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 dark:hover:bg-blue-600 transition"
        title="Pasang Aplikasi SIMAK ke Komputer atau Ponsel (PWA)"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-500" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm my-auto rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-2xl border border-slate-200 dark:border-slate-700 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  Pasang di iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                1. Tekan tombol <strong>Share</strong> (ikon kotak dengan panah ke atas) di menu bawah Safari.<br />
                2. Geser ke bawah lalu pilih opsi <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.<br />
                3. SIMAK akan terpasang sebagai aplikasi mandiri offline.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Aplikasi</span>
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

