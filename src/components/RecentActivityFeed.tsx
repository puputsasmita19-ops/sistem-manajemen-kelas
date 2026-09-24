import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Award,
  CalendarCheck,
  Download,
  FileText,
  History,
  Lock,
  Megaphone,
  RefreshCw,
  School,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
  ChevronRight,
  Sparkles,
  Clock,
  Laptop
} from 'lucide-react';
import { ActivityLog, ActivityActionType, User } from '../types';
import { DatabaseService } from '../services/databaseService';

interface RecentActivityFeedProps {
  currentUser: User;
  onNavigateTab?: (tab: string) => void;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  currentUser,
  onNavigateTab
}) => {
  const dbService = DatabaseService.getInstance();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUserLogs = () => {
    const all = dbService.getAllActivityLogs();
    // Filter by current user ID or Name
    const userLogs = all.filter((l) => {
      const matchId = l.userId && l.userId === currentUser.id;
      const matchName = l.userName && l.userName.toLowerCase() === currentUser.nama.toLowerCase();
      // If user is admin and has same role matching
      const matchAdminRole = currentUser.role === 'admin' && (l.userRole === 'admin' || l.userId === 'user_admin1');
      return matchId || matchName || matchAdminRole;
    });

    // If user has fewer logs, include general recent logs as fallback gracefully
    const finalLogs = userLogs.length > 0 ? userLogs.slice(0, 5) : all.slice(0, 5);
    setLogs(finalLogs);
  };

  useEffect(() => {
    fetchUserLogs();
    const unsubscribe = dbService.subscribeActivityLogs(() => {
      fetchUserLogs();
    });
    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchUserLogs();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Helper icon & color for action types
  const getActionBadgeInfo = (actionType: ActivityActionType) => {
    switch (actionType) {
      case 'grade_input':
      case 'grade_update':
        return {
          icon: Award,
          bg: 'bg-emerald-50 dark:bg-emerald-950/60',
          text: 'text-emerald-700 dark:text-emerald-300',
          border: 'border-emerald-200 dark:border-emerald-800',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          label: 'Nilai Siswa'
        };
      case 'attendance_input':
      case 'qr_attendance_scan':
      case 'qr_session_create':
        return {
          icon: CalendarCheck,
          bg: 'bg-blue-50 dark:bg-blue-950/60',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400',
          label: 'Presensi'
        };
      case 'export_pdf':
      case 'export_data':
      case 'scheduled_export_run':
        return {
          icon: Download,
          bg: 'bg-purple-50 dark:bg-purple-950/60',
          text: 'text-purple-700 dark:text-purple-300',
          border: 'border-purple-200 dark:border-purple-800',
          iconColor: 'text-purple-600 dark:text-purple-400',
          label: 'Ekspor PDF'
        };
      case 'master_academic_create':
      case 'master_academic_update':
      case 'master_academic_delete':
      case 'master_academic_sync':
        return {
          icon: School,
          bg: 'bg-indigo-50 dark:bg-indigo-950/60',
          text: 'text-indigo-700 dark:text-indigo-300',
          border: 'border-indigo-200 dark:border-indigo-800',
          iconColor: 'text-indigo-600 dark:text-indigo-400',
          label: 'Master Akademik'
        };
      case 'user_create':
      case 'user_update':
      case 'user_delete':
      case 'user_batch_role_change':
        return {
          icon: Users,
          bg: 'bg-teal-50 dark:bg-teal-950/60',
          text: 'text-teal-700 dark:text-teal-300',
          border: 'border-teal-200 dark:border-teal-800',
          iconColor: 'text-teal-600 dark:text-teal-400',
          label: 'Pengguna'
        };
      case 'announcement_create':
      case 'announcement_delete':
        return {
          icon: Megaphone,
          bg: 'bg-amber-50 dark:bg-amber-950/60',
          text: 'text-amber-700 dark:text-amber-300',
          border: 'border-amber-200 dark:border-amber-800',
          iconColor: 'text-amber-600 dark:text-amber-400',
          label: 'Pengumuman'
        };
      case 'settings_update':
        return {
          icon: Settings,
          bg: 'bg-slate-100 dark:bg-slate-800',
          text: 'text-slate-700 dark:text-slate-300',
          border: 'border-slate-200 dark:border-slate-700',
          iconColor: 'text-slate-600 dark:text-slate-300',
          label: 'Pengaturan'
        };
      case 'login':
      case 'logout':
      case 'password_reset_request':
        return {
          icon: ShieldCheck,
          bg: 'bg-rose-50 dark:bg-rose-950/60',
          text: 'text-rose-700 dark:text-rose-300',
          border: 'border-rose-200 dark:border-rose-800',
          iconColor: 'text-rose-600 dark:text-rose-400',
          label: 'Autentikasi'
        };
      default:
        return {
          icon: Activity,
          bg: 'bg-slate-100 dark:bg-slate-800',
          text: 'text-slate-700 dark:text-slate-300',
          border: 'border-slate-200 dark:border-slate-700',
          iconColor: 'text-slate-600 dark:text-slate-300',
          label: 'Sistem'
        };
    }
  };

  // Helper format relative time
  const formatRelativeTime = (isoString: string) => {
    try {
      const now = new Date();
      const past = new Date(isoString);
      const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);

      if (diffSec < 60) return 'Baru saja';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
      if (diffSec < 172800) return 'Kemarin';

      return past.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700/80 p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                Aktivitas Terakhir Saya
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                5 Aksi Terkini
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rekam jejak audit trail aksi sistem yang dilakukan oleh akun <strong className="text-slate-800 dark:text-slate-200 font-semibold">{currentUser.nama}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleManualRefresh}
            className={`p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer active:scale-95 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="Segarkan Log Aktivitas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {currentUser.role === 'admin' && onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('activity_logs')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition text-xs font-bold cursor-pointer active:scale-98"
            >
              <span>Audit Trail Lengkap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Feed List */}
      <div className="mt-4 space-y-2.5">
        {logs.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum Ada Aktivitas Tercatat</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Setiap tindakan seperti input nilai, absensi, atau ekspor laporan akan otomatis terekam di sini.
            </p>
          </div>
        ) : (
          logs.map((log, index) => {
            const badge = getActionBadgeInfo(log.actionType);
            const Icon = badge.icon;
            const timeAgo = formatRelativeTime(log.timestamp);

            return (
              <motion.div
                key={log.id || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.04 }}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700/70 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition shadow-2xs"
              >
                {/* Left: Icon, Action Title & Details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${badge.bg} ${badge.border} ${badge.iconColor} shadow-2xs group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {log.actionTitle}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-extrabold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1 break-words">
                      {log.details}
                    </p>
                  </div>
                </div>

                {/* Right: Timestamp & Device Info */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5" title={`Waktu: ${new Date(log.timestamp).toLocaleString('id-ID')}`}>
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="font-medium">{timeAgo}</span>
                  </div>

                  {log.ipOrDevice && (
                    <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      <Laptop className="w-2.5 h-2.5 text-slate-400" />
                      <span className="truncate max-w-[90px]">{log.ipOrDevice}</span>
                    </div>
                  )}

                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Tersimpan</span>
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer link for mobile */}
      {currentUser.role === 'admin' && onNavigateTab && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex sm:hidden justify-center">
          <button
            type="button"
            onClick={() => onNavigateTab('activity_logs')}
            className="w-full py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-800"
          >
            <span>Buka Seluruh Audit Trail Sistem</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
