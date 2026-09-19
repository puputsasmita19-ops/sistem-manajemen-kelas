import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Smartphone,
  Download,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Zap,
  Layers,
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
      {/* 1. Wifi Status Badge (Online / Offline) */}
      {effectivelyOffline ? (
        <div
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold animate-pulse"
          title="Koneksi terputus. Menggunakan Cache Offline lokal."
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Offline</span>
        </div>
      ) : (
        <div
          className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
          title={`Tersambung ke Cloud. Terakhir sinkron: ${lastSyncTime}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span className="text-[11px] font-bold hidden sm:inline">Online</span>
        </div>
      )}

      {/* 2. FITUR WPA / PWA OFFLINE BUTTON (Bersebelahan dengan Icon Wifi) */}
      <button
        type="button"
        id="btn-pwa-offline"
        onClick={() => setShowPwaModal(true)}
        className="px-2 sm:px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-2xs flex items-center gap-1 sm:gap-1.5 text-xs font-bold cursor-pointer group"
        title="Fitur PWA & Mode Offline Mandiri (Klik untuk Buka Pusat Offline)"
        aria-label="Pusat PWA & Mode Offline"
      >
        <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
        <span className="hidden xs:inline sm:inline font-bold">PWA Offline</span>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
      </button>

      {/* 3. Simulator Button to test offline capability - sleek icon button */}
      <button
        type="button"
        onClick={toggleSimulateOffline}
        className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 hidden md:flex items-center justify-center rounded-xl border transition shadow-2xs cursor-pointer ${
          isSimulatedOffline
            ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-700 dark:text-amber-300 ring-2 ring-amber-400'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
        title={isSimulatedOffline ? 'Simulasi Terputus Aktif - Klik untuk pulihkan koneksi online' : 'Uji Simulasi Mode Offline PWA'}
        aria-label="Uji Simulasi Offline"
      >
        <WifiOff className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSimulatedOffline ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`} />
      </button>

      {/* Modal Pusat Fitur PWA & Offline */}
      {showPwaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden text-left">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Pusat PWA & Mode Offline
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aplikasi siap digunakan tanpa koneksi internet (Zero Quota)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPwaModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Status & Features */}
            <div className="mt-4 space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              {/* Feature 1: Service Worker & Cache */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                    Service Worker & Cache Offline Aktif
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Seluruh aset antarmuka, font, skrip sistem, dan ikon tersimpan di CacheStorage browser sehingga aplikasi dapat dibuka meski tanpa sinyal data.
                  </p>
                </div>
              </div>

              {/* Feature 2: Local Database Persistence */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                    Penyimpanan Lokal (IndexedDB & LocalStorage)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Guru & Wali Kelas dapat menginput presensi harian, nilai tugas, UTS, UAS, dan rapor secara offline. Data tersimpan aman di memori perangkat.
                  </p>
                </div>
              </div>

              {/* Feature 3: Auto Sync to Firebase */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                    Sinkronisasi Otomatis saat Online
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Saat perangkat terhubung kembali ke internet, data lokal otomatis disinkronkan ke Cloud Firestore secara instan tanpa kehilangan data.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons in Modal */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-2.5">
              {/* Install PWA Button */}
              {isInstallable ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Pasang Aplikasi (Install PWA)</span>
                </button>
              ) : isInstalled ? (
                <div className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Aplikasi Terpasang (Standalone PWA)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Panduan Pasang Layar Beranda</span>
                </button>
              )}

              {/* Toggle Simulation Button */}
              <button
                type="button"
                onClick={toggleSimulateOffline}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  isSimulatedOffline
                    ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-800 dark:text-amber-200'
                    : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600'
                }`}
              >
                <WifiOff className="w-4 h-4" />
                <span>{isSimulatedOffline ? 'Matikan Simulasi' : 'Uji Mode Offline'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

