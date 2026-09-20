import React, { useState, useEffect } from 'react';
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
  Sparkles
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

  useEffect(() => {
    const unsub = syncService.subscribe(newStatus => {
      setStatus(newStatus);
    });
    // Trigger initial connection and seed
    syncService.initializeAndSeed();

    // Check Drive connectivity
    driveService.isConnected().then(connected => {
      setIsDriveConnected(connected);
    });

    return unsub;
  }, []);

  const raw = dbService.getRawSnapshot();
  const totalUsers = Object.keys(raw.users || {}).length;
  const totalClasses = Object.keys(raw.classes || {}).length;
  const totalSubjects = Object.keys(raw.subjects || {}).length;
  const totalAttendance = Object.keys(raw.attendance || {}).length;
  const totalGrades = Object.keys(raw.grades || {}).length;
  const totalAnnouncements = Object.keys(raw.announcements || {}).length;
  const totalPhotos = driveService.getAllPhotoRecords().length;

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
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
          }`}
          title="Klik untuk melihat status sinkronisasi Firebase & Google Drive"
        >
          <span className={`w-2 h-2 rounded-full ${status.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <Database className="w-3.5 h-3.5" />
          <span className="font-bold hidden sm:inline">
            {status.isConnected ? 'Cloud Sync' : 'Firestore'}
          </span>
        </button>
      </div>

      {/* Detail Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Pusat Sinkronisasi Data Cloud
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Firebase Firestore & Google Drive Storage
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Firebase Status Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    Firebase Cloud Firestore
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    status.isConnected
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                  }`}>
                    {status.isConnected ? 'Terhubung & Sinkron' : 'Koneksi Mandiri'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                  <div>
                    <div className="text-[10px] text-slate-400">Akun Pengguna</div>
                    <div className="font-bold text-sm text-slate-800 dark:text-white">{totalUsers}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Rombel Kelas</div>
                    <div className="font-bold text-sm text-slate-800 dark:text-white">{totalClasses}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Mata Pelajaran</div>
                    <div className="font-bold text-sm text-slate-800 dark:text-white">{totalSubjects}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Log Presensi</div>
                    <div className="font-bold text-sm text-slate-800 dark:text-white">{totalAttendance}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Data Nilai</div>
                    <div className="font-bold text-sm text-slate-800 dark:text-white">{totalGrades}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Pengumuman</div>
                    <div className="font-bold text-sm text-slate-800 dark:text-white">{totalAnnouncements}</div>
                  </div>
                </div>
              </div>

              {/* Google Drive Status Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-amber-500" />
                    Penyimpanan Foto Google Drive
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                    Folder SIMAK_Foto_Siswa
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                  <span>Total Berkas & Pasfoto Terindeks:</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-white">{totalPhotos} Berkas</span>
                </div>
              </div>

              {status.lastSyncedAt && (
                <div className="text-[11px] text-slate-500 text-center">
                  Terakhir diperbarui: {status.lastSyncedAt} WIB
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
