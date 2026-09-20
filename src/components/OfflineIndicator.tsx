import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Smartphone,
  Download,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  ArrowLeft,
  X,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';
import Swal from 'sweetalert2';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('id-ID'));
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Koneksi Terhubung Kembali',
        text: 'Menyinkronkan data dengan Firebase...',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true
      });
      setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
    };

    const handleOffline = () => {
      setIsOnline(false);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'Koneksi Terputus (Mode Offline)',
        text: 'Menggunakan cache data lokal & Service Worker.',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPwaModal) {
        setShowPwaModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPwaModal]);

  const effectivelyOffline = !isOnline || isSimulatedOffline;

  const toggleSimulateOffline = () => {
    const nextVal = !isSimulatedOffline;
    setIsSimulatedOffline(nextVal);
    if (nextVal) {
      Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon: 'info',
        title: 'Simulasi Terputus Aktif',
        text: 'Aplikasi beroperasi dalam cache offline penuh.',
        timer: 3000,
        showConfirmButton: false
      });
    } else {
      setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon: 'success',
        title: 'Simulasi Dinonaktifkan',
        text: 'Koneksi online dipulihkan.',
        timer: 3000,
        showConfirmButton: false
      });
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      Swal.fire({
        icon: 'info',
        title: 'Pasang di iOS Safari',
        html: 'Tekan tombol <b>Bagikan (Share)</b> di bagian bawah Safari, lalu pilih <b>Tambahkan ke Layar Utama (Add to Home Screen)</b>.',
        confirmButtonText: 'Mengerti',
        confirmButtonColor: '#2563EB'
      });
    }
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      {/* 1. Status Badge: Tulisan kecil 'Online' atau 'Terputus' */}
      {effectivelyOffline ? (
        <button
          type="button"
          onClick={() => setShowPwaModal(true)}
          className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-bold animate-pulse cursor-pointer shadow-2xs"
          title="Koneksi terputus. Klik untuk buka status offline."
          aria-label="Koneksi terputus"
        >
          <WifiOff className="w-3 h-3 shrink-0" />
          <span className="leading-none">Terputus</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowPwaModal(true)}
          className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold cursor-pointer shadow-2xs"
          title={`Online & Terhubung Cloud. Terakhir sinkron: ${lastSyncTime}. Klik untuk detail.`}
          aria-label="Status Online"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          <span className="leading-none">Online</span>
        </button>
      )}

      {/* 2. Tombol Fitur PWA (Install PWA) */}
      <button
        type="button"
        id="btn-pwa-offline"
        onClick={() => setShowPwaModal(true)}
        className="px-1.5 sm:px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-2xs flex items-center gap-1 text-[10px] font-bold cursor-pointer"
        title="Pasang Aplikasi (Install PWA) & Pusat Offline"
        aria-label="Pusat PWA & Mode Offline"
      >
        <Smartphone className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="leading-none">PWA</span>
      </button>

      {/* 3. Tombol Uji Coba Offline di Desktop */}
      <button
        type="button"
        onClick={toggleSimulateOffline}
        className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 hidden lg:flex items-center justify-center rounded-lg border transition shadow-2xs cursor-pointer ${
          isSimulatedOffline
            ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-700 dark:text-amber-300 ring-2 ring-amber-400'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
        title={isSimulatedOffline ? 'Simulasi Terputus Aktif - Klik untuk pulihkan online' : 'Uji Simulasi Mode Offline'}
        aria-label="Uji Simulasi Offline"
      >
        <WifiOff className={`w-3.5 h-3.5 ${isSimulatedOffline ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`} />
      </button>

      {/* MODAL PUSAT FITUR PWA & OFFLINE (PROPORSIONAL, RAMAH SMARTPHONE, DILENGKAPI TOMBOL KEMBALI) */}
      {showPwaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setShowPwaModal(false)}
        >
          <div
            className="w-full max-w-md my-auto rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[88dvh] sm:max-h-[85vh] overflow-hidden text-left animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-modal-title"
          >
            {/* Header Modal - Sticky & Tidak Terpotong di Smartphone */}
            <div className="shrink-0 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 id="pwa-modal-title" className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                    Pasang Aplikasi (PWA)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Akses Cepat & Mode Offline Tanpa Kuota
                  </p>
                </div>
              </div>
              {/* Tombol Kembali Atas */}
              <button
                type="button"
                onClick={() => setShowPwaModal(false)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shrink-0 cursor-pointer"
                title="Tutup dan Kembali"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>
            </div>

            {/* Isi Konten Modal - Scrollable & Proporsional */}
            <div className="flex-1 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4 space-y-2.5 text-xs text-slate-700 dark:text-slate-200">
              {/* Kartu Status Koneksi Saat Ini */}
              <div className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${effectivelyOffline ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Koneksi: {effectivelyOffline ? 'Terputus (Mode Offline)' : 'Online (Terhubung)'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Sinkron: {lastSyncTime}
                </span>
              </div>

              {/* Fitur 1: Pasang di Layar Utama HP */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                    Pasang di Layar Utama (Home Screen)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Dapat dibuka langsung dari menu HP tanpa membuka browser, berjalan layar penuh (fullscreen) seperti aplikasi Android dari Play Store.
                  </p>
                </div>
              </div>

              {/* Fitur 2: Mode Offline Bebas Kuota */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                    Bekerja Mandiri Tanpa Kuota Internet
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Presensi kelas, input nilai, dan administrasi dapat diisi saat offline. Data tersimpan aman di memori perangkat (IndexedDB).
                  </p>
                </div>
              </div>

              {/* Fitur 3: Sinkronisasi Otomatis */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                    Sinkronisasi Otomatis saat Online
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Saat perangkat terhubung kembali ke internet, data lokal otomatis disinkronkan ke Cloud Firestore tanpa resiko kehilangan data.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Modal - Sticky di Bawah, Jelas & Ada Tombol Kembali */}
            <div className="shrink-0 p-3 sm:p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex flex-col gap-2">
              {/* Tombol Utama Pasang PWA */}
              {isInstallable ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Pasang Aplikasi (Install PWA)</span>
                </button>
              ) : isInstalled ? (
                <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Aplikasi SIMAK Sudah Terpasang (PWA Aktif)</span>
                </div>
              ) : isIOS ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Petunjuk Pasang di Layar Utama iPhone/iPad</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Pasang Aplikasi ke Layar Utama</span>
                </button>
              )}

              {/* Baris Tombol Aksi Bawah: Tombol KEMBALI & Tombol Uji Offline */}
              <div className="flex items-center gap-2">
                {/* Tombol KEMBALI Sangat Jelas di Smartphone */}
                <button
                  type="button"
                  onClick={() => setShowPwaModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-300/80 dark:border-slate-700 cursor-pointer"
                  aria-label="Kembali ke Aplikasi"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>

                {/* Tombol Uji Coba Mode Offline */}
                <button
                  type="button"
                  onClick={toggleSimulateOffline}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isSimulatedOffline
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-800 dark:text-amber-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  aria-label="Uji Coba Mode Offline"
                >
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>{isSimulatedOffline ? 'Matikan Simulasi' : 'Uji Offline'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

