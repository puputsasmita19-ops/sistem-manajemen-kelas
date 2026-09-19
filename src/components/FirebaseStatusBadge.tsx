import React, { useState, useEffect } from 'react';
import { FirestoreSyncService, SyncStatus } from '../services/firestoreSyncService';
import { Database, CloudCheck, RefreshCw, CheckCircle, AlertCircle, HardDrive } from 'lucide-react';
import Swal from 'sweetalert2';

export const FirebaseStatusBadge: React.FC = () => {
  const syncService = FirestoreSyncService.getInstance();
  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = syncService.subscribe(newStatus => {
      setStatus(newStatus);
    });
    // Trigger initial connection and seed
    syncService.initializeAndSeed();
    return unsub;
  }, []);

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
    <div className="flex items-center">
      <button
        type="button"
        onClick={handleManualSync}
        disabled={isSyncing}
        className={`px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs ${
          status.isConnected
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
        }`}
        title="Status Firebase Firestore. Klik untuk sinkronisasi manual seluruh data sekolah."
      >
        <span className={`w-2 h-2 rounded-full ${status.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
        <Database className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        <span className="font-bold hidden sm:inline">
          {status.isConnected ? 'Firestore' : 'Firestore'}
        </span>
      </button>
    </div>
  );
};
