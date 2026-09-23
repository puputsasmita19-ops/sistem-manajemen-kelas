import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Wifi,
  WifiOff,
  Smartphone,
  Download,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  X,
  ShieldCheck
} from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';
import Swal from 'sweetalert2';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('id-ID'));
  
  // Modals / Popovers
  const [showNetworkModal, setShowNetworkModal] = useState<boolean>(false);
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false);

  const netBtnRef = useRef<HTMLButtonElement>(null);
  const pwaBtnRef = useRef<HTMLButtonElement>(null);
  const netPopoverRef = useRef<HTMLDivElement>(null);
  const pwaPopoverRef = useRef<HTMLDivElement>(null);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Koneksi Terhubung Kembali',
        text: 'Menyinkronkan data dengan Cloud...',
        timer: 2500,
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
        text: 'Aplikasi beralih otomatis ke cache lokal.',
        timer: 3500,
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

  // Handle escape key and click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNetworkModal(false);
        setShowPwaModal(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        showNetworkModal &&
        netPopoverRef.current &&
        !netPopoverRef.current.contains(e.target as Node) &&
        netBtnRef.current &&
        !netBtnRef.current.contains(e.target as Node)
      ) {
        setShowNetworkModal(false);
      }

      if (
        showPwaModal &&
        pwaPopoverRef.current &&
        !pwaPopoverRef.current.contains(e.target as Node) &&
        pwaBtnRef.current &&
        !pwaBtnRef.current.contains(e.target as Node)
      ) {
        setShowPwaModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNetworkModal, showPwaModal]);

  const effectivelyOffline = !isOnline || isSimulatedOffline;

  const toggleSimulateOffline = () => {
    const nextVal = !isSimulatedOffline;
    setIsSimulatedOffline(nextVal);
    if (nextVal) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Simulasi Terputus Aktif',
        text: 'Aplikasi beroperasi dalam cache offline lokal.',
        timer: 2500,
        showConfirmButton: false
      });
    } else {
      setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Simulasi Dinonaktifkan',
        text: 'Koneksi online dipulihkan.',
        timer: 2500,
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
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Instalasi Aplikasi',
        html: 'Untuk memasang aplikasi ini di Desktop/Chrome, klik ikon <b>Instal / Tambahkan ke Layar Utama</b> di samping bilah alamat browser Anda.',
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#2563EB'
      });
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* 1. BUTTON STATUS JARINGAN */}
      <button
        ref={netBtnRef}
        type="button"
        onClick={() => {
          setShowPwaModal(false);
          setShowNetworkModal((prev) => !prev);
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border transition shadow-2xs cursor-pointer text-xs font-bold active:scale-95 shrink-0 ${
          showNetworkModal
            ? 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-100 ring-2 ring-emerald-400/40'
            : effectivelyOffline
            ? 'border-rose-300 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
            : 'border-emerald-200/90 dark:border-emerald-800/80 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
        }`}
        title="Klik untuk membuka Status Jaringan & Mode Offline"
        aria-expanded={showNetworkModal}
      >
        <span className="relative flex h-2 w-2">
          {!effectivelyOffline && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              effectivelyOffline ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          ></span>
        </span>
        {effectivelyOffline ? (
          <WifiOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
        ) : (
          <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}
        <span className="tracking-tight">{effectivelyOffline ? 'Terputus' : 'Online'}</span>
      </button>

      {/* 2. BUTTON PASANG APLIKASI (PWA) */}
      <button
        ref={pwaBtnRef}
        type="button"
        id="btn-pwa-offline"
        onClick={() => {
          setShowNetworkModal(false);
          setShowPwaModal((prev) => !prev);
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border transition shadow-2xs cursor-pointer text-xs font-bold active:scale-95 shrink-0 ${
          showPwaModal
            ? 'border-blue-500 bg-blue-100 text-blue-900 dark:bg-blue-900/80 dark:text-blue-100 ring-2 ring-blue-400/40'
            : 'border-blue-200/90 dark:border-blue-800/80 bg-blue-50/90 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/60'
        }`}
        title="Klik untuk membuka Pusat Pasang Aplikasi (PWA)"
        aria-expanded={showPwaModal}
      >
        <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="tracking-tight">PWA</span>
      </button>

      {/* ========================================================================= */}
      {/* MODAL 1: STATUS JARINGAN (PORTAL KE BODY, ERGONOMIC & BEBAS CLIPPING)      */}
      {/* ========================================================================= */}
      {showNetworkModal &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
            <div
              ref={netPopoverRef}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md my-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    effectivelyOffline
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {effectivelyOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                      Status Koneksi Jaringan
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      Monitoring Internet & Cache Lokal
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNetworkModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 space-y-3.5 text-xs text-slate-700 dark:text-slate-200">
                <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                  effectivelyOffline
                    ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                }`}>
                  <span className={`w-3 h-3 rounded-full shrink-0 ${
                    effectivelyOffline ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'
                  }`} />
                  <div className="min-w-0">
                    <div className="font-bold text-xs">
                      {effectivelyOffline ? 'Koneksi Terputus (Mode Offline)' : 'Online & Terhubung Cloud'}
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {effectivelyOffline
                        ? 'Data tersimpan lokal di IndexedDB HP/Komputer.'
                        : 'Aplikasi tersinkronisasi otomatis dengan server.'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Sinkron Terakhir:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{lastSyncTime} WIB</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Arsitektur:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Offline-First Engine</span>
                  </div>
                </div>

                {/* Uji Offline */}
                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-200">Uji Coba Offline</div>
                    <div className="text-[10px] text-amber-700 dark:text-amber-300">
                      Simulasikan tanpa internet.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSimulateOffline}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer border ${
                      isSimulatedOffline
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    {isSimulatedOffline ? 'Matikan' : 'Aktifkan'}
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowNetworkModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* MODAL 2: PASANG APLIKASI PWA (PORTAL KE BODY, ERGONOMIC & BEBAS CLIPPING)  */}
      {/* ========================================================================= */}
      {showPwaModal &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
            <div
              ref={pwaPopoverRef}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md my-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                      Pasang Aplikasi SIMAK
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      Layar Utama & Pengalaman Native App
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPwaModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 space-y-3 text-xs text-slate-700 dark:text-slate-200">
                {isInstalled && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-xs">Aplikasi sudah terpasang di perangkat ini.</span>
                  </div>
                )}

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">Layar Penuh Seperti App Asli</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Bisa dibuka langsung dari home screen tanpa address bar browser.
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <HardDrive className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">Akses Cepat & Hemat Data</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Aplikasi terbuka instan bahkan saat offline tanpa kuota.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowPwaModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                >
                  Tutup
                </button>

                {isInstalled ? (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Terpasang</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Pasang Aplikasi</span>
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
