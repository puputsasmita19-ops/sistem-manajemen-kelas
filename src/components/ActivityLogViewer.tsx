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
  ArrowUpDown,
  QrCode,
  Sparkles,
  Smartphone,
  ScanLine,
  Check,
  Calendar
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Pagination } from './Pagination';

interface ActivityLogViewerProps {
  currentUserRole?: UserRole;
}

export const ActivityLogViewer: React.FC<ActivityLogViewerProps> = () => {
  const dbService = DatabaseService.getInstance();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'qr_scans'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'all' | 'today' | '7days'>('all');
  const [selectedQRClass, setSelectedQRClass] = useState<string>('all');
  const [selectedQRMethod, setSelectedQRMethod] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const classes = useMemo(() => dbService.getAllClasses(), []);

  const refreshLogs = () => {
    setLogs(dbService.getAllActivityLogs());
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole, selectedActionType, selectedTimeRange, selectedQRClass, selectedQRMethod, sortOrder, activeTab]);

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
        // Tab Mode: if in qr_scans tab, restrict to qr_attendance_scan only
        if (activeTab === 'qr_scans' && log.actionType !== 'qr_attendance_scan') {
          return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchUser = log.userName.toLowerCase().includes(q);
          const matchTitle = log.actionTitle.toLowerCase().includes(q);
          const matchDetails = log.details.toLowerCase().includes(q);
          const matchDevice = (log.ipOrDevice || '').toLowerCase().includes(q);
          const matchStudentId = log.metadata?.studentId ? String(log.metadata.studentId).toLowerCase().includes(q) : false;
          const matchClassName = log.metadata?.className ? String(log.metadata.className).toLowerCase().includes(q) : false;
          if (!matchUser && !matchTitle && !matchDetails && !matchDevice && !matchStudentId && !matchClassName) {
            return false;
          }
        }

        // Role Filter (only in all tab)
        if (activeTab === 'all' && selectedRole !== 'all' && log.userRole !== selectedRole) {
          return false;
        }

        // Action Type Filter (only in all tab)
        if (activeTab === 'all' && selectedActionType !== 'all' && log.actionType !== selectedActionType) {
          return false;
        }

        // Class Filter for QR Scans
        if (selectedQRClass !== 'all') {
          const logClassId = log.metadata?.classId;
          const logClassName = log.metadata?.className;
          if (logClassId !== selectedQRClass && logClassName !== selectedQRClass) {
            return false;
          }
        }

        // Method Filter for QR Scans
        if (selectedQRMethod !== 'all') {
          const method = log.metadata?.method || '';
          if (!method.toLowerCase().includes(selectedQRMethod.toLowerCase())) {
            return false;
          }
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
  }, [logs, activeTab, searchQuery, selectedRole, selectedActionType, selectedTimeRange, selectedQRClass, selectedQRMethod, sortOrder]);

  const validPage = Math.min(
    Math.max(1, currentPage),
    Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage))
  );

  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice((validPage - 1) * itemsPerPage, validPage * itemsPerPage);
  }, [filteredLogs, validPage, itemsPerPage]);

  // Metric Stats
  const metrics = useMemo(() => {
    const total = logs.length;
    const qrScans = logs.filter((l) => l.actionType === 'qr_attendance_scan').length;
    const now = new Date();
    const qrScansToday = logs.filter((l) => {
      if (l.actionType !== 'qr_attendance_scan') return false;
      const d = new Date(l.timestamp);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }).length;

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

    return { total, qrScans, qrScansToday, logins, gradeUpdates, userMutations };
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

  const handleExportQRScansCSV = () => {
    const qrLogs = logs.filter((l) => l.actionType === 'qr_attendance_scan');
    if (qrLogs.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Belum Ada Log QR',
        text: 'Belum ada data riwayat pemindaian QR Code presensi untuk diekspor.'
      });
      return;
    }

    const headers = [
      'No',
      'Tanggal Presensi',
      'Waktu Tepat Pemindaian (WIB)',
      'ID / NIS Siswa',
      'Nama Lengkap Siswa',
      'Kelas',
      'Mata Pelajaran',
      'Status Presensi',
      'Metode Scan',
      'Session ID QR',
      'Waktu Audit Sistem (ISO)'
    ];

    const rows = qrLogs.map((l, idx) => {
      const d = new Date(l.timestamp);
      const dateStr = d.toLocaleDateString('id-ID');
      const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const meta = l.metadata || {};

      return [
        `"${idx + 1}"`,
        `"${meta.date || dateStr}"`,
        `"${meta.scannedAt || timeStr + ' WIB'}"`,
        `"${(meta.studentId || l.userId || '').replace(/"/g, '""')}"`,
        `"${(meta.studentName || l.userName || '').replace(/"/g, '""')}"`,
        `"${(meta.className || '-').replace(/"/g, '""')}"`,
        `"${(meta.subjectName || 'Presensi Harian').replace(/"/g, '""')}"`,
        `"${meta.status === 'H' ? 'Hadir (H)' : meta.status || 'Hadir (H)'}"`,
        `"${(meta.method || 'Scan QR').replace(/"/g, '""')}"`,
        `"${(meta.sessionId || '-').replace(/"/g, '""')}"`,
        `"${l.timestamp}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SIMAK_Log_Presensi_QR_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Swal.fire({
      icon: 'success',
      title: 'Log Scan QR Berhasil Diekspor',
      text: `File CSV berisi ${qrLogs.length} riwayat pemindaian presensi QR Code berhasil diunduh.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  const getActionBadge = (type: ActivityActionType) => {
    switch (type) {
      case 'qr_attendance_scan':
        return {
          label: 'Scan QR Siswa',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
          icon: QrCode
        };
      case 'qr_session_create':
        return {
          label: 'Sesi QR Kelas',
          color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
          icon: Clock
        };
      case 'login':
        return {
          label: 'Login / Sesi',
          color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
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
              Memantau seluruh riwayat penting sekolah secara terpusat, mencakup riwayat presensi scan QR Code siswa, autentikasi login pengguna, perubahan nilai rapor, dan manajemen akun.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {activeTab === 'qr_scans' ? (
              <button
                onClick={handleExportQRScansCSV}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Ekspor Log QR (.csv)
              </button>
            ) : (
              <button
                onClick={() => dbService.exportLogsToCSV()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Ekspor Semua (.csv)
              </button>
            )}
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
        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white dark:bg-slate-800 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Audit Log</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.total}</p>
          <span className="text-[11px] text-slate-400">Semua aktivitas tercatat</span>
        </div>

        <div
          onClick={() => setActiveTab('qr_scans')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'qr_scans'
              ? 'bg-white dark:bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" /> Scan QR Presensi
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <ScanLine className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{metrics.qrScans}</p>
          <span className="text-[11px] text-slate-400">
            <strong>{metrics.qrScansToday}</strong> scan hari ini
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Autentikasi Login</span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">{metrics.logins}</p>
          <span className="text-[11px] text-slate-400">Sesi login pengguna</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nilai & Akun</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">{metrics.gradeUpdates + metrics.userMutations}</p>
          <span className="text-[11px] text-slate-400">Pembaruan data akademik</span>
        </div>
      </div>

      {/* Navigation View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Semua Log Aktivitas</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-700/50 dark:bg-slate-200 text-slate-200 dark:text-slate-800 font-bold">
            {metrics.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qr_scans')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'qr_scans'
              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Log Pemindaian QR Code Presensi</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-700 text-white font-bold">
            {metrics.qrScans}
          </span>
        </button>
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
              placeholder={
                activeTab === 'qr_scans'
                  ? 'Cari nama siswa, NIS/ID, kelas, atau perangkat...'
                  : 'Cari berdasarkan nama pengguna, judul aktivitas, atau rincian...'
              }
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

          {activeTab === 'all' ? (
            <>
              {/* Action Type Filter */}
              <div className="w-full md:w-auto flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedActionType}
                  onChange={(e) => setSelectedActionType(e.target.value)}
                  className="w-full md:w-44 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Tipe Aksi</option>
                  <option value="qr_attendance_scan">Scan QR Presensi Siswa</option>
                  <option value="qr_session_create">Sesi QR Presensi Kelas</option>
                  <option value="login">Autentikasi (Login)</option>
                  <option value="grade_input">Input Nilai Siswa</option>
                  <option value="grade_update">Update Nilai Siswa</option>
                  <option value="attendance_input">Input Presensi Harian</option>
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
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  <option value="wali_kelas">Wali Kelas</option>
                  <option value="admin">Admin</option>
                  <option value="orang_tua">Orang Tua</option>
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Filter Kelas Khusus QR */}
              <div className="w-full md:w-auto flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedQRClass}
                  onChange={(e) => setSelectedQRClass(e.target.value)}
                  className="w-full md:w-44 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Semua Kelas</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Metode Scan */}
              <div className="w-full md:w-auto">
                <select
                  value={selectedQRMethod}
                  onChange={(e) => setSelectedQRMethod(e.target.value)}
                  className="w-full md:w-40 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Semua Metode Scan</option>
                  <option value="kamera">Kamera Live (Siswa/Guru)</option>
                  <option value="pin">Kode PIN Manual</option>
                  <option value="guru">Pemindai Guru</option>
                </select>
              </div>
            </>
          )}

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
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Urutkan Waktu"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
          </button>
        </div>

        {/* Filter Badges summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <span>
            Menampilkan <strong>{filteredLogs.length}</strong> catatan {activeTab === 'qr_scans' ? 'pemindaian QR presensi' : 'aktivitas sistem'}
          </span>
          {(searchQuery || selectedRole !== 'all' || selectedActionType !== 'all' || selectedTimeRange !== 'all' || selectedQRClass !== 'all' || selectedQRMethod !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRole('all');
                setSelectedActionType('all');
                setSelectedTimeRange('all');
                setSelectedQRClass('all');
                setSelectedQRMethod('all');
              }}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold text-xs cursor-pointer"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* Logs Table / Card List View */}
      {activeTab === 'qr_scans' ? (
        /* DEDICATED QR CODE SCANNING AUDIT TABLE */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-600 text-white">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Tabel Riwayat Pemindaian QR Code Presensi
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold">
                    {filteredLogs.length} Presensi Sukses
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Waktu presensi akurat per detik saat siswa memindai QR Code dinamis kelas.
                </p>
              </div>
            </div>

            <button
              onClick={handleExportQRScansCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh CSV
            </button>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center mx-auto">
                <QrCode className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Belum Ada Riwayat Pemindaian QR</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Siswa yang berhasil memindai QR Code dinamis di proyektor atau kamera guru akan tercatat di sini secara otomatis.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">Siswa (Nama & NIS/ID)</th>
                    <th className="py-3 px-4">Kelas & Sesi</th>
                    <th className="py-3 px-4">Waktu Tepat Scan</th>
                    <th className="py-3 px-4">Metode Pemindaian</th>
                    <th className="py-3 px-4 text-center">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {paginatedLogs.map((log, idx) => {
                    const meta = log.metadata || {};
                    const exactTime = meta.scannedAt || new Date(log.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    }) + ' WIB';

                    const formattedDate = new Date(log.timestamp).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });

                    const studentId = meta.studentId || log.userId;
                    const studentName = meta.studentName || log.userName;
                    const className = meta.className || '-';
                    const subjectName = meta.subjectName || 'Presensi Harian';
                    const method = meta.method || 'Kamera Live';

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-400">
                          {(validPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {studentName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {studentName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                NIS / ID: {studentId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="inline-block font-semibold text-slate-800 dark:text-slate-200">
                              {className}
                            </span>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {subjectName}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="font-bold font-mono text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              {exactTime}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formattedDate}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-[11px]">
                            {method.toLowerCase().includes('pin') ? (
                              <KeyRound className="w-3 h-3 text-amber-600" />
                            ) : (
                              <Smartphone className="w-3 h-3 text-blue-600" />
                            )}
                            <span>{method}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Hadir (H)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredLogs.length > 0 && (
            <Pagination
              currentPage={validPage}
              totalItems={filteredLogs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemsPerPageOptions={[10, 25, 50, 100]}
              itemLabel="riwayat pemindaian QR"
            />
          )}
        </div>
      ) : (
        /* GENERAL ACTIVITY AUDIT TRAIL VIEW */
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
              {paginatedLogs.map((log) => {
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

          {filteredLogs.length > 0 && (
            <Pagination
              currentPage={validPage}
              totalItems={filteredLogs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemsPerPageOptions={[10, 25, 50, 100]}
              itemLabel="aktivitas"
            />
          )}
        </div>
      )}
    </div>
  );
};
