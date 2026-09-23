import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FirestoreSyncService, SyncStatus } from '../services/firestoreSyncService';
import { GoogleDriveService } from '../services/googleDriveService';
import { DatabaseService } from '../services/databaseService';
import { User } from '../types';
import {
  Database,
  RefreshCw,
  X,
  ShieldCheck,
  Users,
  School,
  BookOpen,
  CalendarCheck,
  Award,
  HardDrive,
  Cloud,
  CheckCircle2
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = syncService.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    syncService.initializeAndSeed();
    return unsub;
  }, []);

  // Handle escape key and click outside to close popover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const raw = dbService.getRawSnapshot();
  const totalUsers = Object.keys(raw.users || {}).length;
  const totalClasses = Object.keys(raw.classes || {}).length;
  const totalSubjects = Object.keys(raw.subjects || {}).length;
  const totalAttendance = Object.keys(raw.attendance || {}).length;
  const totalGrades = Object.keys(raw.grades || {}).length;
  const totalPhotos = driveService.getAllPhotoRecords().length;
  const totalAllEntities = totalUsers + totalClasses + totalSubjects + totalAttendance + totalGrades;

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const count = await syncService.pushAllDataToFirestore();
      setIsSyncing(false);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Sinkronisasi Berhasil!',
        text: `${count} dokumen telah diperbarui di Cloud Firestore.`,
        timer: 2500,
        showConfirmButton: false
      });
    } catch (err: any) {
      setIsSyncing(false);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Sinkronisasi Gagal',
        text: err.message || 'Gagal mengirim data ke Firestore'
      });
    }
  };

  return (
    <>
      {/* TRIGGER BUTTON */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border transition shadow-2xs cursor-pointer text-xs font-bold active:scale-95 shrink-0 ${
          isOpen
            ? 'border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-900/80 dark:text-amber-100 ring-2 ring-amber-400/40'
            : 'border-amber-200/90 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60'
        }`}
        title="Klik untuk membuka Panel Sinkronisasi Cloud Firestore"
        aria-expanded={isOpen}
      >
        <span className="relative flex h-2 w-2">
          {status.isConnected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              status.isConnected ? 'bg-amber-500' : 'bg-slate-400'
            }`}
          ></span>
        </span>
        <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="tracking-tight">Firestore</span>
      </button>

      {/* ERGONOMIC MODAL / POPOVER DI DEPAN (PORTAL KE BODY SUPAYA TIDAK TERPOTONG SAMA SEKALI) */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
            <div
              ref={popoverRef}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg my-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            >
              {/* Header Popover */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-50/60 via-white to-amber-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                      Cloud Firestore & Database
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      Pusat Sinkronisasi & Replikasi Realtime
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition cursor-pointer shrink-0"
                  title="Tutup Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Popover */}
              <div className="p-4 sm:p-5 space-y-4 text-xs">
                {/* Connection Status Box */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${status.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {status.isConnected ? 'Terhubung ke Google Cloud Firestore' : 'Mode Cache Lokal (Offline-First)'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Sinkron: {status.lastSyncedAt || 'Siap sinkronkan'}
                      </div>
                    </div>
                  </div>

                  <div className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Enkripsi Aktif</span>
                  </div>
                </div>

                {/* 6 Ringkasan Data Akademik */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Data Sekolah Terdaftar ({totalAllEntities} Entitas)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-center">
                      <div className="flex items-center justify-center mb-0.5">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">User</div>
                      <div className="font-black text-sm text-slate-900 dark:text-white">{totalUsers}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-center">
                      <div className="flex items-center justify-center mb-0.5">
                        <School className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Rombel</div>
                      <div className="font-black text-sm text-slate-900 dark:text-white">{totalClasses}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-center">
                      <div className="flex items-center justify-center mb-0.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Mapel</div>
                      <div className="font-black text-sm text-slate-900 dark:text-white">{totalSubjects}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-center">
                      <div className="flex items-center justify-center mb-0.5">
                        <CalendarCheck className="w-3.5 h-3.5 text-teal-500" />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Presensi</div>
                      <div className="font-black text-sm text-slate-900 dark:text-white">{totalAttendance}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-center">
                      <div className="flex items-center justify-center mb-0.5">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Nilai</div>
                      <div className="font-black text-sm text-slate-900 dark:text-white">{totalGrades}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-center">
                      <div className="flex items-center justify-center mb-0.5">
                        <HardDrive className="w-3.5 h-3.5 text-purple-500" />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Foto Drive</div>
                      <div className="font-black text-sm text-slate-900 dark:text-white">{totalPhotos}</div>
                    </div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                  <Cloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Data otomatis disinkronkan ke Cloud Firestore secara background saat ada perubahan data.
                  </p>
                </div>
              </div>

              {/* Footer Aksi */}
              <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
