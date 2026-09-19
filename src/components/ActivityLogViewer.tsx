import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityLog,
  ActivityActionType,
  UserRole
} from '../types';
import { DatabaseService } from '../services/databaseService';
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  School,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
  KeyRound,
  FileSpreadsheet,
  Clock,
  Laptop,
  Flame,
  ArrowUpDown
} from 'lucide-react';
import Swal from 'sweetalert2';

interface ActivityLogViewerProps {
  currentUserRole?: UserRole;
}

export const ActivityLogViewer: React.FC<ActivityLogViewerProps> = () => {
  const dbService = DatabaseService.getInstance();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'all' | 'today' | '7days'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const refreshLogs = () => {
    setLogs(dbService.getAllActivityLogs());
  };

  useEffect(() => {
    refreshLogs();
    const unsub = dbService.subscribeActivityLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsub();
  }, []);

  // Filtered and Sorted Logs
  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchUser = log.userName.toLowerCase().includes(q);
          const matchTitle = log.actionTitle.toLowerCase().includes(q);
          const matchDetails = log.details.toLowerCase().includes(q);
          const matchDevice = (log.ipOrDevice || '').toLowerCase().includes(q);
          if (!matchUser && !matchTitle && !matchDetails && !matchDevice) {
            return false;
          }
        }

        // Role Filter
        if (selectedRole !== 'all' && log.userRole !== selectedRole) {
          return false;
        }

        // Action Type Filter
        if (selectedActionType !== 'all' && log.actionType !== selectedActionType) {
          return false;
        }

        // Time Range Filter
        if (selectedTimeRange !== 'all') {
          const logDate = new Date(log.timestamp);
          const now = new Date();
          if (selectedTimeRange === 'today') {
            if (
              logDate.getFullYear() !== now.getFullYear() ||
              logDate.getMonth() !== now.getMonth() ||
              logDate.getDate() !== now.getDate()
            ) {
              return false;
            }
          } else if (selectedTimeRange === '7days') {
            const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
            if (diffDays > 7) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'desc') {
          return b.timestamp.localeCompare(a.timestamp);
        } else {
          return a.timestamp.localeCompare(b.timestamp);
        }
      });
  }, [logs, searchQuery, selectedRole, selectedActionType, selectedTimeRange, sortOrder]);

  // Metric Stats
  const metrics = useMemo(() => {
    const total = logs.length;
    const logins = logs.filter((l) => l.actionType === 'login').length;
    const gradeUpdates = logs.filter(
      (l) => l.actionType === 'grade_input' || l.actionType === 'grade_update'
    ).length;
    const userMutations = logs.filter(
      (l) =>
        l.actionType === 'user_create' ||
        l.actionType === 'user_update' ||
        l.actionType === 'user_delete' ||
        l.actionType === 'bulk_action'
    ).length;

    return { total, logins, gradeUpdates, userMutations };
  }, [logs]);

  const handleClearLogs = () => {
    Swal.fire({
      title: 'Bersihkan Seluruh Riwayat Log?',
      text: 'Tindakan ini akan mengosongkan semua riwayat audit trail log aktivitas di aplikasi dan Firebase.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Bersihkan Log',
      cancelButtonText: 'Batal',
      customClass: {
        popup: 'rounded-2xl dark:bg-slate-800 dark:border-slate-700'
      }
    }).then((res) => {
      if (res.isConfirmed) {
        dbService.clearActivityLogs();
        Swal.fire({
          icon: 'success',
          title: 'Riwayat Log Dibersihkan',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const getActionBadge = (type: ActivityActionType) => {
    switch (type) {
      case 'login':
        return {
          label: 'Login / Sesi',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
          icon: KeyRound
        };
      case 'grade_input':
      case 'grade_update':
        return {
          label: 'Nilai & Rapor',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
          icon: FileSpreadsheet
        };
      case 'user_create':
      case 'user_update':
      case 'user_delete':
        return {
          label: 'Manajemen Akun',
          color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
          icon: Users
        };
      case 'attendance_input':
        return {
          label: 'Presensi Harian',
          color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
          icon: CheckCircle2
        };
      case 'announcement_create':
      case 'announcement_delete':
        return {
          label: 'Pengumuman',
          color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
          icon: Info
        };
      case 'bulk_action':
        return {
          label: 'Aksi Massal',
          color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
          icon: AlertTriangle
        };
      default:
        return {
          label: 'Aktivitas Sistem',
          color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          icon: History
        };
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />;
      case 'wali_kelas':
        return <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />;
      case 'guru':
        return <BookOpen className="w-3.5 h-3.5 text-blue-600" />;
      case 'siswa':
        return <School className="w-3.5 h-3.5 text-emerald-600" />;
      case 'orang_tua':
        return <Users className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <History className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div id="activity-log-viewer-container" className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden border border-slate-700/60">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              Tersinkronisasi Realtime ke Firebase Firestore (/logs)
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <History className="w-7 h-7 text-indigo-400" />
              Audit Trail & Log Aktivitas Sistem
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Memantau seluruh riwayat penting sekolah secara terpusat, mencakup autentikasi login pengguna, input & pembaruan nilai, absensi, hingga pembuatan dan penghapusan akun.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => dbService.exportLogsToCSV()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Ekspor CSV
            </button>
            <button
              onClick={refreshLogs}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              title="Segarkan Log"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800/60 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              title="Bersihkan Log"
            >
              <Trash2 className="w-4 h-4" />
              Bersihkan
            </button>
          </div>
        </div>

        {/* Decorative Grid Pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none"></div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Catatan Log</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.total}</p>
          <span className="text-[11px] text-slate-400">Audit trail aktif</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Autentikasi Login</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{metrics.logins}</p>
          <span className="text-[11px] text-slate-400">Sesi pengguna masuk</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Aktivitas Nilai</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{metrics.gradeUpdates}</p>
          <span className="text-[11px] text-slate-400">Input & pembaruan nilai</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Operasi Akun</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">{metrics.userMutations}</p>
          <span className="text-[11px] text-slate-400">Tambah / Ubah / Hapus</span>
        </div>
      </div>

      {/* Filter and Search Bar Control Box */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full md:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama pengguna, judul aktivitas, atau rincian..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Type Filter */}
          <div className="w-full md:w-auto flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="w-full md:w-44 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Tipe Aksi</option>
              <option value="login">Autentikasi (Login)</option>
              <option value="grade_input">Input Nilai Siswa</option>
              <option value="grade_update">Update Nilai Siswa</option>
              <option value="attendance_input">Input Presensi</option>
              <option value="user_create">Pendaftaran Akun</option>
              <option value="user_update">Pembaruan Profil Akun</option>
              <option value="user_delete">Penghapusan Akun</option>
              <option value="announcement_create">Penerbitan Pengumuman</option>
              <option value="announcement_delete">Penghapusan Pengumuman</option>
              <option value="bulk_action">Aksi Massal / Impor</option>
              <option value="settings_update">Pengaturan Sistem</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="w-full md:w-auto">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full md:w-36 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Peran</option>
              <option value="admin">Admin</option>
              <option value="guru">Guru</option>
              <option value="wali_kelas">Wali Kelas</option>
              <option value="siswa">Siswa</option>
              <option value="orang_tua">Orang Tua</option>
            </select>
          </div>

          {/* Time Filter */}
          <div className="w-full md:w-auto">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="w-full md:w-36 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Urutkan Waktu"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
          </button>
        </div>

        {/* Filter Badges summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <span>
            Menampilkan <strong>{filteredLogs.length}</strong> dari <strong>{logs.length}</strong> aktivitas
          </span>
          {(searchQuery || selectedRole !== 'all' || selectedActionType !== 'all' || selectedTimeRange !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRole('all');
                setSelectedActionType('all');
                setSelectedTimeRange('all');
              }}
              className="text-blue-600 hover:text-blue-700 font-semibold text-xs"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* Logs Table / Card List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak ada log aktivitas</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Tidak ditemukan catatan log aktivitas yang cocok dengan kriteria pencarian atau filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {filteredLogs.map((log) => {
              const badge = getActionBadge(log.actionType);
              const ActionIcon = badge.icon;
              const formattedDate = new Date(log.timestamp).toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Action Icon Box */}
                    <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 shrink-0 mt-0.5">
                      <ActionIcon className="w-4 h-4" />
                    </div>

                    <div className="space-y-1">
                      {/* Top Action Title and Badge */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {log.actionTitle}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Details Description */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                        {log.details}
                      </p>

                      {/* Metadata row */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                          {getRoleIcon(log.userRole)}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{log.userName}</span>
                          <span className="text-[10px] uppercase px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">
                            {log.userRole}
                          </span>
                        </span>

                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          {formattedDate} WIB
                        </span>

                        {log.ipOrDevice && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Laptop className="w-3 h-3" />
                            {log.ipOrDevice}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Firebase Synced Pill */}
                  <div className="shrink-0 sm:self-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Cloud Synced
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
