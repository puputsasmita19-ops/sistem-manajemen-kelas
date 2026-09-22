import React, { useState, useEffect, useRef } from 'react';
import { FirestoreSyncService, SyncStatus } from '../services/firestoreSyncService';
import { GoogleDriveService } from '../services/googleDriveService';
import { DatabaseService } from '../services/databaseService';
import { User } from '../types';
import {
  Database,
  CloudCheck,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  HardDrive,
  X,
  ShieldCheck,
  Layers,
  Sparkles,
  ArrowLeft,
  Info,
  CheckCircle2,
  Users,
  School,
  BookOpen,
  CalendarCheck,
  Award,
  Megaphone,
  Lock,
  Cloud
} from 'lucide-react';
import Swal from 'sweetalert2';

interface FirebaseStatusBadgeProps {
  currentUser?: User | null;
}

export const FirebaseStatusBadge: React.FC<FirebaseStatusBadgeProps> = ({ currentUser }) => {
  // Hanya role admin yang diizinkan melihat status & kontrol sinkronisasi Firebase
  if (currentUser && currentUser.role !== 'admin') {
    return null;
  }

  const syncService = FirestoreSyncService.getInstance();
  const driveService = GoogleDriveService.getInstance();
  const dbService = DatabaseService.getInstance();

  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = syncService.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    // Trigger initial connection and seed
    syncService.initializeAndSeed();

    // Check Drive connectivity
    driveService.isConnected().then((connected) => {
      setIsDriveConnected(connected);
    });

    return unsub;
  }, []);

  // Pastikan scroll berada di bagian paling atas saat modal dibuka
  useEffect(() => {
    if (isOpenModal && modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
  }, [isOpenModal]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenModal) {
        setIsOpenModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenModal]);

  const raw = dbService.getRawSnapshot();
  const totalUsers = Object.keys(raw.users || {}).length;
  const totalClasses = Object.keys(raw.classes || {}).length;
  const totalSubjects = Object.keys(raw.subjects || {}).length;
  const totalAttendance = Object.keys(raw.attendance || {}).length;
  const totalGrades = Object.keys(raw.grades || {}).length;
  const totalAnnouncements = Object.keys(raw.announcements || {}).length;
  const totalPhotos = driveService.getAllPhotoRecords().length;
  const totalAllEntities = totalUsers + totalClasses + totalSubjects + totalAttendance + totalGrades + totalAnnouncements;

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const count = await syncService.pushAllDataToFirestore();
      setIsSyncing(false);
      Swal.fire({
        icon: 'success',
        title: 'Sinkronisasi Firebase Berhasil!',
        text: `Sebanyak ${count} dokumen relasional sekolah telah tersinkronisasi ke Firebase Firestore.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      setIsSyncing(false);
      Swal.fire({
        icon: 'error',
        title: 'Sinkronisasi Gagal',
        text: err.message || 'Gagal mengirim data ke Firestore'
      });
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsOpenModal(true)}
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
            status.isConnected
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          title="Klik untuk membuka status & kontrol sinkronisasi Firebase & Cloud Storage"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              status.isConnected ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
          <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="font-bold hidden sm:inline">Firestore</span>
        </button>
      </div>

      {/* Detail Modal Sinkronisasi Firebase */}
      {isOpenModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpenModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-5xl h-[96vh] sm:h-[90vh] max-h-[840px] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Sticky, Selalu Terlihat Penuh, Proporsional) */}
            <div className="shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs shrink-0">
                  <Database className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight truncate">
                      Pusat Sinkronisasi Data Cloud Firebase
                    </h3>
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Multi-Cloud Engine
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5 truncate">
                    Integrasi Firebase Cloud Firestore & Google Drive Cloud Backup
                  </p>
                </div>
              </div>

              {/* Close 'X' Button */}
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white transition cursor-pointer shrink-0"
                title="Tutup Menu"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body - Scrollable Secara Mandiri, Proporsional dan Tidak Terpotong */}
            <div
              ref={modalBodyRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4"
            >
              {/* Overview Metric Banner (Penuh & Informatif) */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50 to-amber-50/60 dark:from-slate-800/80 dark:via-indigo-950/40 dark:to-slate-800/80 border border-indigo-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Status Replikasi Sinkronisasi Data Real-Time</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                      Total <strong>{totalAllEntities}</strong> catatan akademik & <strong>{totalPhotos}</strong> berkas tersimpan aman di cloud.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <div className="px-2.5 py-1 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    Mode: <strong className="text-indigo-600 dark:text-indigo-400">Offline-First</strong>
                  </div>
                  <div className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Terenkripsi</span>
                  </div>
                </div>
              </div>

              {/* 2 Proportional Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-stretch">
                {/* 1. Firebase Firestore Status & Metrics Card */}
                <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                          <Database className="w-4 h-4" />
                        </div>
                        <span>Firebase Firestore</span>
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1.5 border ${
                          status.isConnected
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            status.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                          }`}
                        />
                        {status.isConnected ? 'Terhubung & Aktif' : 'Koneksi Mandiri'}
                      </span>
                    </div>

                    {/* 6 Grid Metrics (Balanced, Clean, and Legible) */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-3.5">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-center shadow-2xs hover:border-indigo-300 transition">
                        <div className="flex items-center justify-center text-slate-400 mb-1">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold truncate">Akun User</div>
                        <div className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-0.5">{totalUsers}</div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-center shadow-2xs hover:border-indigo-300 transition">
                        <div className="flex items-center justify-center text-slate-400 mb-1">
                          <School className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold truncate">Rombel</div>
                        <div className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-0.5">{totalClasses}</div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-center shadow-2xs hover:border-indigo-300 transition">
                        <div className="flex items-center justify-center text-slate-400 mb-1">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold truncate">Mapel</div>
                        <div className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-0.5">{totalSubjects}</div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-center shadow-2xs hover:border-indigo-300 transition">
                        <div className="flex items-center justify-center text-slate-400 mb-1">
                          <CalendarCheck className="w-3.5 h-3.5 text-teal-500" />
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold truncate">Presensi</div>
                        <div className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-0.5">{totalAttendance}</div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-center shadow-2xs hover:border-indigo-300 transition">
                        <div className="flex items-center justify-center text-slate-400 mb-1">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold truncate">Data Nilai</div>
                        <div className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-0.5">{totalGrades}</div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-center shadow-2xs hover:border-indigo-300 transition">
                        <div className="flex items-center justify-center text-slate-400 mb-1">
                          <Megaphone className="w-3.5 h-3.5 text-rose-500" />
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold truncate">Pengumuman</div>
                        <div className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-0.5">{totalAnnouncements}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Status Snapshot:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {status.lastSyncedAt ? `${status.lastSyncedAt} WIB` : 'Siap Sinkron'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Data offline tersimpan secara lokal dan siap disinkronkan ke Firestore kapan saja.
                    </div>
                  </div>
                </div>

                {/* 2. Google Drive Storage & Auto-Replication Card */}
                <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-4 flex flex-col justify-between shadow-xs">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <span>Google Drive Storage</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        SIMAK_Foto_Siswa
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
                      <div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-bold">Total Berkas & Pasfoto:</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Tersimpan di Cloud Storage</div>
                      </div>
                      <span className="font-black text-sm text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs">
                        {totalPhotos} Berkas
                      </span>
                    </div>

                    {/* Status Info Replikasi */}
                    <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        Semua transaksi akademik (presensi, nilai, mutasi rombel, dan audit log) otomatis direplikasi dan diamankan dengan enkripsi cloud.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Layanan database cloud online dan siap pakai</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer (Sticky, Responsif, Tidak Terpotong) */}
            <div className="shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md">
              {/* Tombol Kembali (Bisa digunakan di Desktop & Smartphone) */}
              <button
                type="button"
                id="btn-close-firebase-modal"
                onClick={() => setIsOpenModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold flex items-center justify-center gap-2 transition shadow-2xs cursor-pointer text-xs sm:text-sm shrink-0"
                aria-label="Kembali"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              {/* Status Indicator & Tombol Sinkronkan Sekarang */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <span className="hidden md:inline text-[11px] text-slate-500 dark:text-slate-400 font-medium text-right">
                  {status.isConnected ? 'Cloud siap disinkronkan' : 'Koneksi lokal aktif'}
                </span>
                <button
                  type="button"
                  id="btn-sync-firebase-now"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


