import React from 'react';
import { AppSettings, User } from '../types';
import { AppLogo } from './AppLogo';
import { FirebaseStatusBadge } from './FirebaseStatusBadge';
import { OfflineIndicator } from './OfflineIndicator';
import { RunningText } from './RunningText';
import { DatabaseService } from '../services/databaseService';
import { Clock, Menu, Bell } from 'lucide-react';
import { realtimeNotificationService } from '../services/realtimeNotificationService';

interface AndroidTopBarProps {
  appSettings: AppSettings;
  currentUser: User;
  clock: {
    timeFormatted?: string;
    dateFormatted?: string;
  };
  remainingTimeFormatted: string;
  onOpenDrawer: () => void;
  onOpenTour: () => void;
}

export const AndroidTopBar: React.FC<AndroidTopBarProps> = ({
  appSettings,
  currentUser,
  clock,
  remainingTimeFormatted,
  onOpenDrawer,
  onOpenTour
}) => {
  // Data kontekstual berdasarkan role pengguna aktif
  const dbService = DatabaseService.getInstance();
  
  const assignedClass = currentUser.role === 'wali_kelas'
    ? dbService.getHomeroomClass(currentUser.id)
    : null;

  const teacherSubjects = currentUser.role === 'guru'
    ? dbService.getSubjectsByTeacher(currentUser.id)
    : [];

  const studentClass = currentUser.role === 'siswa'
    ? dbService.getStudentClass(currentUser.id)
    : null;

  const parentChildren = currentUser.role === 'orang_tua'
    ? dbService.getChildrenOfParent(currentUser.id)
    : [];

  // Teks status berjalan (running text) untuk setiap role
  const userStatusRunningText = (() => {
    switch (currentUser.role) {
      case 'admin':
        return `Administrator Sistem • ${currentUser.nama}`;
      case 'wali_kelas':
        return `${assignedClass ? `Wali Kelas ${assignedClass.nama_kelas}` : 'Wali Kelas'} • ${currentUser.nama}`;
      case 'guru':
        return `${teacherSubjects.length > 0 ? `Guru ${teacherSubjects.map(s => s.nama_mapel).join(', ')}` : 'Guru Mata Pelajaran'} • ${currentUser.nama}`;
      case 'siswa':
        return `Siswa ${studentClass ? studentClass.nama_kelas : ''} • ${currentUser.nama}${currentUser.nis ? ` (NIS: ${currentUser.nis})` : ''}`;
      case 'orang_tua':
        return `Wali Murid ${parentChildren.length > 0 ? `dari ${parentChildren.map(c => c.nama).join(', ')}` : ''} • ${currentUser.nama}`;
      default:
        return `${currentUser.nama}`;
    }
  })();

  return (
    <header
      id="android-top-app-bar"
      className="md:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs transition-colors"
    >
      {/* Row 1: App Brand Logo & Quick Action Control Chips */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/60">
        {/* Left: App Logo & School Name */}
        <div className="flex items-center gap-2 min-w-0">
          <AppLogo settings={appSettings} size="sm" />
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-xs font-black text-slate-900 dark:text-white leading-none tracking-tight truncate">
              {appSettings.appName}
            </h1>
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"
              title="Sistem Online & Terhubung"
            />
          </div>
        </div>

        {/* Right: Quick Action Android Chips */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Realtime Status Indicator (Hanya tampil untuk role admin) */}
          {currentUser.role === 'admin' && <FirebaseStatusBadge currentUser={currentUser} />}
          <OfflineIndicator />

          {/* Auto-Logout Timer Chip */}
          <button
            type="button"
            onClick={() => {
              realtimeNotificationService.notifyActionInfo(
                'Sesi Pengguna Aktif',
                `Waktu aktif sesi login Anda tersisa ${remainingTimeFormatted} sebelum otomatis logout demi keamanan data.`
              );
            }}
            className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/80 px-2 py-1 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title={`Sesi aktif. Waktu otomatis logout: ${remainingTimeFormatted}`}
          >
            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="font-mono">{remainingTimeFormatted}</span>
          </button>

          {/* Push Notification Button */}
          <button
            type="button"
            onClick={async () => {
              const perm = await realtimeNotificationService.requestBrowserNotificationPermission();
              if (perm === 'granted') {
                realtimeNotificationService.notifyActionSuccess(
                  'Notifikasi Siap',
                  'Pemberitahuan perubahan nilai dan pengumuman sekolah akan langsung muncul.'
                );
              } else if (perm === 'default') {
                realtimeNotificationService.notifyActionInfo(
                  'Izin Notifikasi',
                  'Silakan izinkan notifikasi pada peramban Anda untuk pembaruan realtime.'
                );
              }
            }}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition cursor-pointer"
            title="Pengaturan Notifikasi Realtime"
            aria-label="Pengaturan Notifikasi Realtime"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Android App Drawer Hamburger Button */}
          <button
            type="button"
            onClick={onOpenDrawer}
            className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center transition shadow-2xs cursor-pointer"
            title="Buka Menu Aplikasi Android"
            aria-label="Buka Menu Aplikasi Android"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Status Pengguna & Nama Pengguna Mode Running Text (Terletak di bawah icon, full width tanpa tabrakan) */}
      <div
        onClick={() => {
          realtimeNotificationService.notifyActionInfo(
            'Informasi Akun Anda',
            `${userStatusRunningText} • Role: ${currentUser.role.toUpperCase()}`
          );
        }}
        className="flex items-center gap-2 px-3 py-1 bg-slate-50/90 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800/80 text-[11px] cursor-pointer"
        title="Klik untuk info detail status akun Anda"
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-950/90 border border-blue-200 dark:border-blue-800/80 px-1.5 py-0.5 rounded-md shrink-0">
            {currentUser.role === 'wali_kelas'
              ? 'Wali Kelas'
              : currentUser.role === 'admin'
              ? 'Admin'
              : currentUser.role === 'guru'
              ? 'Guru'
              : currentUser.role === 'siswa'
              ? 'Siswa'
              : 'Wali Murid'}
          </span>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <RunningText
            text={userStatusRunningText}
            forceRunning={true}
            maxWidthClass="w-full"
            className="text-[11px] text-slate-800 dark:text-slate-100 font-semibold tracking-tight"
            speed={12}
          />
        </div>
      </div>
    </header>
  );
};
