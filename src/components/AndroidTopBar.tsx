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
      className="md:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 py-2 shadow-2xs transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        {/* Left: App Logo & School Name with Running Text Status */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <AppLogo settings={appSettings} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 leading-none">
              <h1 className="text-xs font-black text-slate-900 dark:text-white leading-none shrink-0">
                {appSettings.appName}
              </h1>
              <span className="text-[10px] text-slate-300 dark:text-slate-600 shrink-0">•</span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0 bg-blue-50 dark:bg-blue-950/60 px-1 py-0.5 rounded">
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
            <div className="flex items-center gap-1 mt-0.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block shrink-0" />
              <RunningText
                text={userStatusRunningText}
                forceRunning={true}
                maxWidthClass="w-full max-w-[150px] xs:max-w-[185px] sm:max-w-[230px]"
                className="text-[10.5px] text-slate-700 dark:text-slate-200 font-medium"
                speed={11}
              />
            </div>
          </div>
        </div>

        {/* Right: Quick Action Android Chips */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Realtime Status Indicator (Hanya tampil untuk role admin) */}
          {currentUser.role === 'admin' && <FirebaseStatusBadge currentUser={currentUser} />}
          <OfflineIndicator />

          {/* Auto-Logout Timer Chip */}
          <div
            className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 px-2 py-1 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300"
            title={`Sesi aktif. Waktu otomatis logout: ${remainingTimeFormatted}`}
          >
            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="font-mono">{remainingTimeFormatted}</span>
          </div>

          {/* Push Notification Button */}
          <button
            onClick={async () => {
              await realtimeNotificationService.requestBrowserNotificationPermission();
            }}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition cursor-pointer"
            title="Aktifkan Notifikasi"
            aria-label="Aktifkan Notifikasi"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Android App Drawer Hamburger Button */}
          <button
            onClick={onOpenDrawer}
            className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center transition shadow-2xs cursor-pointer"
            title="Buka Menu Aplikasi Android"
            aria-label="Buka Menu Aplikasi Android"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
