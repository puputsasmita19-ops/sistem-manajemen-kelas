import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseService } from './services/databaseService';
import { User, UserRole, AppSettings } from './types';
import { AttendanceManager } from './components/AttendanceManager';
import { GradeManager } from './components/GradeManager';
import { UserManagement } from './components/UserManagement';
import { AppSettingsManager } from './components/AppSettingsManager';
import { AppLogo } from './components/AppLogo';
import { StudentPortal } from './components/StudentPortal';
import { SchemaAndRulesViewer } from './components/SchemaAndRulesViewer';
import { ChartAttendance } from './components/ChartAttendance';
import { ChartGrades } from './components/ChartGrades';
import { LoginPage } from './components/LoginPage';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { ThemeToggle } from './components/ThemeToggle';
import { OfflineIndicator } from './components/OfflineIndicator';
import { FirebaseStatusBadge } from './components/FirebaseStatusBadge';
import { DrivePhotoManager } from './components/DrivePhotoManager';
import { DashboardOverview } from './components/DashboardOverview';
import { HomeroomDashboard } from './components/homeroom/HomeroomDashboard';
import { RunningText } from './components/RunningText';
import { ActivityLogViewer } from './components/ActivityLogViewer';
import { AndroidTopBar } from './components/AndroidTopBar';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { AndroidAppDrawer } from './components/AndroidAppDrawer';
import { ExitAppConfirmModal } from './components/ExitAppConfirmModal';
import { realtimeNotificationService } from './services/realtimeNotificationService';
import { navigationBackService } from './services/navigationBackService';
import { antiCheatSecurityService } from './services/antiCheatSecurityService';
import { TourService } from './services/tourService';
import { useRealtimeClock } from './utils/timeUtils';
import { useIdleAutoLogout } from './utils/useIdleAutoLogout';
import Swal from 'sweetalert2';
import {
  School,
  Users,
  Award,
  CalendarCheck2,
  FileText,
  Database,
  ShieldAlert,
  LogOut,
  RotateCcw,
  Sparkles,
  BookOpen,
  GraduationCap,
  HeartHandshake,
  CheckCircle2,
  TrendingUp,
  Download,
  Clock,
  Calendar,
  ShieldCheck,
  HardDrive,
  Megaphone,
  ArrowUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  Code2,
  LayoutGrid,
  MoreHorizontal,
  X,
  History,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';

const SESSION_STORAGE_KEY = 'SIMAK_ACTIVE_USER_SESSION';
const LAST_ACTIVE_TAB_KEY = 'SIMAK_LAST_ACTIVE_TAB';

// Mapping tab yang valid dan diizinkan untuk setiap peran pengguna
const VALID_ROLE_TABS: Record<UserRole, string[]> = {
  admin: [
    'dashboard',
    'attendance',
    'grades',
    'homeroom',
    'users',
    'app_settings',
    'running_text',
    'drive_photos',
    'architecture',
    'activity_logs'
  ],
  wali_kelas: ['dashboard', 'attendance', 'grades', 'homeroom'],
  guru: ['dashboard', 'attendance', 'grades'],
  siswa: ['student_portal', 'dashboard'],
  orang_tua: ['student_portal', 'dashboard']
};

export const isTabAllowedForRole = (tab: string | null | undefined, role: UserRole): boolean => {
  if (!tab || tab === 'login') return false;
  const allowed = VALID_ROLE_TABS[role];
  return allowed ? allowed.includes(tab) : false;
};

export const getDefaultTabForRole = (role: UserRole): string => {
  return role === 'siswa' || role === 'orang_tua' ? 'student_portal' : 'dashboard';
};

export const resolveValidTab = (requestedTab: string | null | undefined, user: User | null): string => {
  if (!user) return 'login';
  // 1. Cek tab yang diminta (misal dari hash URL) jika diizinkan untuk role ini
  if (requestedTab && requestedTab !== 'login' && isTabAllowedForRole(requestedTab, user.role)) {
    return requestedTab;
  }
  // 2. Cek tab terakhir yang tersimpan di localStorage jika valid untuk role ini
  try {
    const savedTab = localStorage.getItem(LAST_ACTIVE_TAB_KEY);
    if (savedTab && savedTab !== 'login' && isTabAllowedForRole(savedTab, user.role)) {
      return savedTab;
    }
  } catch (e) {}
  // 3. Fallback ke tab default untuk role terkait
  return getDefaultTabForRole(user.role);
};

export default function App() {
  const dbService = DatabaseService.getInstance();
  const allUsers = dbService.getAllUsers();
  const clock = useRealtimeClock();

  // App Identity & Branding State
  const [appSettings, setAppSettings] = useState<AppSettings>(() => dbService.getAppSettings());
  const [isAndroidDrawerOpen, setIsAndroidDrawerOpen] = useState(false);

  // Authentication State - Defaults to null (Login Page) so any new visitor lands on the login page first
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Subscribe to changes in AppSettings & Initialize Anti-Cheat Security Suite
  useEffect(() => {
    antiCheatSecurityService.initialize();
    const unsub = dbService.subscribeAppSettings((updated) => {
      setAppSettings(updated);
      document.title = `${updated.appName} - Sistem Manajemen Sekolah`;
    });
    return () => unsub();
  }, []);

  // Real-time Database and Firebase Sync Auto-Refresh Listener for Dashboard & Charts
  const [dataVersion, setDataVersion] = useState(0);
  useEffect(() => {
    const unsub = dbService.subscribeDataChange(() => {
      setDataVersion(v => v + 1);
    });
    return () => unsub();
  }, []);

  // Initialize Realtime Notifications for announcements and grades updates
  useEffect(() => {
    realtimeNotificationService.init(() => currentUser);
    if (currentUser) {
      realtimeNotificationService.checkLoginUrgentPushNotifications(currentUser);
    }
  }, [currentUser]);

  // Auto-trigger role tour on first login / session start
  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        TourService.getInstance().startTour(
          currentUser,
          appSettings.appName,
          (tab) => setActiveTab(tab),
          false
        );
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [currentUser?.id]);

  // Active Tab state - Robust persistence across page reload / refresh & URL hash synchronization
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      return resolveValidTab(hash, currentUser);
    } catch (e) {
      return currentUser ? getDefaultTabForRole(currentUser.role) : 'login';
    }
  });

  // Inisialisasi Android Back Navigation & Exit Prevention Handler di semua kondisi
  useEffect(() => {
    if (!currentUser) return;

    // Pasang guard history dan listener popstate
    const cleanup = navigationBackService.initialize({
      onConfirmExit: () => {
        setShowExitConfirmModal(true);
      }
    });

    return () => {
      cleanup();
    };
  }, [currentUser]);

  // When user is not logged in, enforce '#login' in the URL hash
  useEffect(() => {
    if (!currentUser) {
      if (window.location.hash !== '#login') {
        window.history.replaceState({ app: 'simak-root' }, '', '#login');
      }
    }
  }, [currentUser]);

  // Listen to browser hash changes (e.g. direct links / browser history)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (!currentUser) {
        if (hash !== 'login') {
          window.history.replaceState({ app: 'simak-root' }, '', '#login');
        }
        return;
      }
      if (hash && hash !== 'login' && isTabAllowedForRole(hash, currentUser.role)) {
        if (hash !== activeTab) {
          setActiveTab(hash);
        }
      } else if (hash === 'login' || !isTabAllowedForRole(hash, currentUser.role)) {
        // Logged-in user should not be on #login or invalid hash, normalize hash back to activeTab
        const currentState = window.history.state || { app: 'simak-guard' };
        window.history.replaceState(currentState, '', `#${activeTab}`);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab, currentUser]);

  // Navigation scroll container & overflow state
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkNavScroll = () => {
    if (navContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navContainerRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  const scrollNav = (direction: 'left' | 'right') => {
    if (navContainerRef.current) {
      const offset = direction === 'left' ? -200 : 200;
      navContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkNavScroll();
    const handleResize = () => checkNavScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentUser]);

  // Save active tab whenever it changes & update URL hash & auto-scroll into view
  useEffect(() => {
    if (!currentUser) {
      if (window.location.hash !== '#login') {
        window.history.replaceState({ app: 'simak-root' }, '', '#login');
      }
      return;
    }

    if (activeTab && isTabAllowedForRole(activeTab, currentUser.role)) {
      try {
        localStorage.setItem(LAST_ACTIVE_TAB_KEY, activeTab);
        if (window.location.hash.replace(/^#\/?/, '').trim() !== activeTab) {
          const currentState = window.history.state || { app: 'simak-guard' };
          window.history.replaceState(currentState, '', `#${activeTab}`);
        }
      } catch (e) {
        // Ignore
      }

      // Smoothly bring the active tab into center view
      setTimeout(() => {
        const activeBtn = document.getElementById(`tab-${activeTab.replace(/_/g, '-')}`);
        if (activeBtn && navContainerRef.current) {
          activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
        checkNavScroll();
      }, 100);
    }
  }, [activeTab, currentUser]);

  // Ensure active tab is accessible for currentUser role; fallback immediately if not allowed
  useEffect(() => {
    if (!currentUser) return;
    if (!isTabAllowedForRole(activeTab, currentUser.role)) {
      const validTab = resolveValidTab(null, currentUser);
      setActiveTab(validTab);
    }
  }, [currentUser, activeTab]);

  // Floating Back to Top Button
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {}

    // Check if there was a saved tab in localStorage that is valid for this user
    let targetTab = getDefaultTabForRole(user.role);
    try {
      const saved = localStorage.getItem(LAST_ACTIVE_TAB_KEY);
      if (saved && isTabAllowedForRole(saved, user.role)) {
        targetTab = saved;
      }
    } catch (e) {}

    setActiveTab(targetTab);
  };

  const performDirectLogout = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(LAST_ACTIVE_TAB_KEY);
    } catch (e) {}
    window.history.replaceState({ app: 'simak-root' }, '', '#login');
    setCurrentUser(null);
    setActiveTab('login');
  }, []);

  // Fitur Auto-Logout bila aplikasi tidak digunakan selama 15 menit
  const { remainingTimeFormatted, resetTimer } = useIdleAutoLogout({
    timeoutMinutes: 15,
    warningSeconds: 60,
    enabled: !!currentUser,
    onLogout: performDirectLogout
  });

  const handleLogout = () => {
    Swal.fire({
      title: 'Keluar dari Sistem?',
      text: 'Anda akan dialihkan kembali ke halaman login.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#EF4444'
    }).then(res => {
      if (res.isConfirmed) {
        performDirectLogout();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Berhasil Keluar',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const handleResetData = () => {
    Swal.fire({
      title: '⚠️ Konfirmasi Reset Database',
      html: `
        <div class="text-left text-xs space-y-2 text-slate-600 dark:text-slate-300">
          <div class="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200">
            <strong>PERINGATAN:</strong> Tindakan ini akan <strong>menghapus seluruh perubahan</strong> data pengguna baru, presensi harian, dan nilai yang baru saja diinput, serta mengembalikan database ke data bawaan demo.
          </div>
          <p class="font-medium text-slate-700 dark:text-slate-200">
            Untuk mencegah reset database secara tidak sengaja, silakan ketik kata <strong class="text-rose-600 dark:text-rose-400 font-mono">RESET</strong> pada kotak berikut:
          </p>
        </div>
      `,
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Ketik "RESET" di sini...',
      showCancelButton: true,
      confirmButtonText: 'Ya, Reset Database',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      inputValidator: (value) => {
        if (value !== 'RESET') {
          return 'Ketik kata "RESET" (huruf besar) untuk melanjutkan!';
        }
      }
    }).then(res => {
      if (res.isConfirmed) {
        dbService.resetDatabase();
        window.location.reload();
      }
    });
  };

  // If user is not authenticated, display the dedicated Login Page!
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} appSettings={appSettings} />;
  }

  // Compute stats for Dashboard
  const classes = dbService.getAllClasses();
  const subjects = dbService.getAllSubjects();
  const students = allUsers.filter(u => u.role === 'siswa');

  // Overall Attendance stats
  const allAttendance = Object.values(dbService.getRawSnapshot().attendance);
  const totalAtt = allAttendance.length || 1;
  const hCount = allAttendance.filter(a => a.status === 'H').length;
  const iCount = allAttendance.filter(a => a.status === 'I').length;
  const sCount = allAttendance.filter(a => a.status === 'S').length;
  const aCount = allAttendance.filter(a => a.status === 'A').length;
  const attendanceRate = Math.round((hCount / totalAtt) * 100);

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'wali_kelas':
        return 'Wali Kelas';
      case 'guru':
        return 'Guru';
      case 'siswa':
        return 'Siswa';
      case 'orang_tua':
        return 'Orang Tua';
      default:
        return String(role).replace('_', ' ');
    }
  };

  const userBadgeText = `${currentUser.nama} • ${getRoleDisplayName(currentUser.role)}`;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* SMARTPHONE TOP APP BAR (PENGALAMAN APLIKASI ANDROID NATIVE) */}
      <AndroidTopBar
        appSettings={appSettings}
        currentUser={currentUser}
        clock={clock}
        remainingTimeFormatted={remainingTimeFormatted}
        onOpenDrawer={() => setIsAndroidDrawerOpen(true)}
        onOpenTour={() => {
          TourService.getInstance().startTour(
            currentUser,
            appSettings.appName,
            (tab) => setActiveTab(tab),
            true
          );
        }}
      />

      {/* DESKTOP TOP APPLICATION BAR (PENGALAMAN DESKTOP WEB PRO & LEGA) */}
      <header className="hidden md:block bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-16 py-2 gap-3 flex-nowrap">
            {/* Left: Logo & Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <AppLogo settings={appSettings} size="md" />
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    {appSettings.appName}
                  </h1>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[260px] truncate">
                  {appSettings.appDescription}
                </p>
              </div>
            </div>

            {/* Right: Badges for Clock & Date, Firebase + Wifi / PWA Offline + Action Dock */}
            <div className="flex items-center gap-2.5 shrink-0 ml-auto">
              {/* Badges for Clock & Date, Firebase, WPA Offline & Network status */}
              <div className="flex items-center gap-1.5">
                <div
                  className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs"
                  title={`Waktu & Tanggal Realtime: ${clock.timeFormatted} • ${clock.dateFormatted}`}
                >
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
                    <span className="font-mono font-bold text-slate-900 dark:text-amber-300">
                      {clock.timeFormatted}
                    </span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="whitespace-nowrap text-xs">{clock.dateFormatted}</span>
                  </div>
                </div>

                {/* Firebase Sync Status Badge (Hanya ditampilkan untuk Administrator) */}
                {currentUser.role === 'admin' && <FirebaseStatusBadge currentUser={currentUser} />}
                <OfflineIndicator />

                {/* Auto-Logout Timer Indicator (15 min idle) */}
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 shadow-2xs cursor-help"
                  title={`Proteksi Keamanan: Sesi akan logout otomatis setelah 15 menit tanpa aktivitas. Waktu tersisa: ${remainingTimeFormatted}. Gerakkan mouse atau sentuh layar untuk memperpanjang.`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-amber-300">{remainingTimeFormatted}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-0.5" />

              {/* Unified Proportional Action Dock */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-900/70 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs shrink-0">
                {/* 0. Panduan Tour Interaktif */}
                <button
                  id="btn-interactive-tour"
                  onClick={() => {
                    TourService.getInstance().startTour(
                      currentUser,
                      appSettings.appName,
                      (tab) => setActiveTab(tab),
                      true
                    );
                  }}
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/80 transition shadow-2xs cursor-pointer"
                  title="Mulai Panduan Tour Interaktif Berdasarkan Role"
                  aria-label="Panduan Interaktif"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                {/* 1. Theme Toggle */}
                <ThemeToggle />

                {/* 2. Reset Database Button */}
                <button
                  id="btn-reset-database"
                  onClick={handleResetData}
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition shadow-2xs cursor-pointer"
                  title="Reset Database ke Initial Seed"
                  aria-label="Reset Database"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* 3. Exit / Logout Button */}
                <button
                  id="btn-logout"
                  onClick={handleLogout}
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:border-rose-300 dark:hover:border-rose-800 transition shadow-2xs cursor-pointer"
                  title="Keluar / Logout Akun"
                  aria-label="Keluar / Logout Akun"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* DESKTOP SUB-BAR: Running Text Identitas Pengguna & Hak Akses */}
      <div className="hidden md:block bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 py-1.5 px-6 lg:px-8 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-center text-xs">
          <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 px-3 py-1 rounded-full shadow-2xs max-w-lg overflow-hidden">
            <span
              className="inline-flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-400 shrink-0 bg-blue-50 dark:bg-blue-950/80 border border-blue-200/80 dark:border-blue-800/80 px-2 py-0.5 rounded-full text-[11px]"
              title="Data akun & aktivitas tersinkronisasi secara real-time"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Akun:</span>
            </span>

            <div className="overflow-hidden min-w-0 max-w-[340px]">
              <RunningText
                text={`${currentUser.nama} • ${getRoleDisplayName(currentUser.role)}`}
                maxLength={28}
                maxWidthClass="w-full"
                className="text-xs font-semibold text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* DESKTOP NAVIGATION TAB BAR (Mode Tab Terpusat & Responsif dengan Indikator Scroll Pintar) */}
      <div className="hidden md:block bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs sticky top-[65px] z-30 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 relative flex items-center">
          {/* Tombol Geser Kiri (Muncul jika ada menu di sebelah kiri) */}
          {canScrollLeft && (
            <button
              onClick={() => scrollNav('left')}
              className="absolute left-1.5 z-20 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-md flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-950/80 hover:text-blue-600 hover:border-blue-300 transition cursor-pointer"
              title="Geser menu ke kiri"
              aria-label="Geser menu ke kiri"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Left Gradient Overflow Indicator */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white dark:from-slate-800 to-transparent pointer-events-none z-10" />
          )}

          {/* Centered Scrollable Tab Row */}
          <div
            ref={navContainerRef}
            onScroll={checkNavScroll}
            className="flex-1 overflow-x-auto py-2 scrollbar-none scroll-smooth flex justify-start sm:justify-center px-4"
          >
            <nav className="inline-flex items-center gap-1.5 sm:gap-2 min-w-max mx-auto">
              {/* Dasbor Tab */}
              <button
                id="tab-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>Dasbor</span>
              </button>

              {/* Presensi Tab (Admin, Wali Kelas, Guru) */}
              {(currentUser.role === 'admin' || currentUser.role === 'wali_kelas' || currentUser.role === 'guru') && (
                <button
                  id="tab-attendance"
                  onClick={() => setActiveTab('attendance')}
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'attendance'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <CalendarCheck2 className="w-4 h-4 shrink-0" />
                  <span>Presensi</span>
                </button>
              )}

              {/* Nilai & Rapor Tab (Admin, Wali Kelas, Guru) */}
              {(currentUser.role === 'admin' || currentUser.role === 'wali_kelas' || currentUser.role === 'guru') && (
                <button
                  id="tab-grades"
                  onClick={() => setActiveTab('grades')}
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'grades'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Award className="w-4 h-4 shrink-0" />
                  <span>Nilai & Rapor</span>
                </button>
              )}

              {/* Menu Wali Kelas Tab (18 Fitur Lengkap: Admin & Wali Kelas) */}
              {(currentUser.role === 'admin' || currentUser.role === 'wali_kelas') && (
                <button
                  id="tab-homeroom"
                  onClick={() => setActiveTab('homeroom')}
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'homeroom'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25 ring-2 ring-indigo-300 dark:ring-indigo-700'
                      : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <School className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Menu Wali Kelas</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black">
                    18
                  </span>
                </button>
              )}

              {/* Foto Drive Tab (Hanya untuk Admin) */}
              {currentUser.role === 'admin' && (
                <button
                  id="tab-drive-photos"
                  onClick={() => setActiveTab('drive_photos')}
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'drive_photos'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <HardDrive className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Foto Drive</span>
                </button>
              )}

              {/* Pengguna Tab (Admin only) */}
              {currentUser.role === 'admin' && (
                <button
                  id="tab-users"
                  onClick={() => setActiveTab('users')}
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'users'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Pengguna</span>
                </button>
              )}

              {/* Identitas & Logo Tab (Admin only) */}
              {currentUser.role === 'admin' && (
                <button
                  id="tab-app-settings"
                  onClick={() => setActiveTab('app_settings')}
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'app_settings'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>Identitas & Logo</span>
                </button>
              )}

              {/* Running Text Login Tab (Admin only) */}
              {currentUser.role === 'admin' && (
                <button
                  id="tab-running-text"
                  onClick={() => setActiveTab('running_text')}
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'running_text'
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Megaphone className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Running Text</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'running_text'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  }`}>
                    Login
                  </span>
                </button>
              )}

              {/* Portal Siswa / Orang Tua Tab */}
              {(currentUser.role === 'siswa' || currentUser.role === 'orang_tua') && (
                <button
                  id="tab-student-portal"
                  onClick={() => setActiveTab('student_portal')}
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'student_portal'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>{currentUser.role === 'orang_tua' ? 'Portal Wali Murid' : 'Portal Siswa'}</span>
                </button>
              )}

              {/* Skema & Keamanan Tab (Hanya untuk Admin) */}
              {currentUser.role === 'admin' && (
                <button
                  id="tab-architecture"
                  onClick={() => setActiveTab('architecture')}
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'architecture'
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Database className="w-4 h-4 shrink-0" />
                  <span>Skema & Keamanan</span>
                </button>
              )}

              {/* Log Aktivitas Tab (Audit Trail - Khusus Admin) */}
              {currentUser.role === 'admin' && (
                <button
                  id="tab-activity-logs"
                  onClick={() => setActiveTab('activity_logs')}
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'activity_logs'
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <History className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Log Aktivitas</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Gradient Overflow Indicator */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white dark:from-slate-800 to-transparent pointer-events-none z-10" />
          )}

          {/* Tombol Geser Kanan (Muncul jika masih ada menu di sebelah kanan) */}
          {canScrollRight && (
            <button
              onClick={() => scrollNav('right')}
              className="absolute right-1.5 z-20 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 shadow-md flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-950/80 hover:border-blue-400 transition cursor-pointer animate-pulse"
              title="Geser untuk melihat menu lainnya"
              aria-label="Geser untuk melihat menu lainnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
        {/* Tab Content Views with Ultra-Fast Responsive Transition */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* VIEW: DASHBOARD (Overview) */}
            {activeTab === 'dashboard' && (
              <DashboardOverview
                currentUser={currentUser}
                clock={clock}
                students={students}
                classes={classes}
                subjects={subjects}
                attendanceRate={attendanceRate}
                hCount={hCount}
                iCount={iCount}
                sCount={sCount}
                aCount={aCount}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {/* VIEW: USER MANAGEMENT (Khusus Role Admin) */}
            {activeTab === 'users' && currentUser.role === 'admin' && (
              <UserManagement />
            )}

            {/* VIEW: IDENTITAS & LOGO APLIKASI (Khusus Role Admin) */}
            {activeTab === 'app_settings' && currentUser.role === 'admin' && (
              <AppSettingsManager initialTab="general" onSettingsSaved={(saved) => setAppSettings(saved)} />
            )}

            {/* VIEW: EDIT RUNNING TEXT LOGIN (Khusus Role Admin) */}
            {activeTab === 'running_text' && currentUser.role === 'admin' && (
              <AppSettingsManager initialTab="running_text" onSettingsSaved={(saved) => setAppSettings(saved)} />
            )}

            {/* VIEW: ATTENDANCE MANAGER (Admin, Wali Kelas, Guru) */}
            {activeTab === 'attendance' && (currentUser.role === 'admin' || currentUser.role === 'wali_kelas' || currentUser.role === 'guru') && (
              <AttendanceManager currentRole={currentUser.role} currentUserId={currentUser.id} />
            )}

            {/* VIEW: GRADE MANAGER (Admin, Guru, Wali Kelas) */}
            {activeTab === 'grades' && (currentUser.role === 'admin' || currentUser.role === 'wali_kelas' || currentUser.role === 'guru') && (
              <GradeManager currentRole={currentUser.role} currentUserId={currentUser.id} />
            )}

            {/* VIEW: ADMINISTRASI WALI KELAS (18 Fitur Terintegrasi) */}
            {activeTab === 'homeroom' && (currentUser.role === 'admin' || currentUser.role === 'wali_kelas') && (
              <HomeroomDashboard
                currentClassId="class_10_ipa1"
                userRole={currentUser.role}
                studentList={students.map(s => ({ id: s.id, nama: s.nama }))}
              />
            )}

            {/* VIEW: GOOGLE DRIVE PHOTO DATABASE (Khusus Role Admin) */}
            {activeTab === 'drive_photos' && currentUser.role === 'admin' && (
              <DrivePhotoManager currentRole={currentUser.role} currentUserId={currentUser.id} />
            )}

            {/* VIEW: STUDENT PORTAL (Siswa & Orang Tua) */}
            {activeTab === 'student_portal' && (currentUser.role === 'siswa' || currentUser.role === 'orang_tua') && (
              <StudentPortal currentUser={currentUser} />
            )}

            {/* VIEW: ARCHITECTURE & SECURITY RULES (Khusus Role Admin) */}
            {activeTab === 'architecture' && currentUser.role === 'admin' && (
              <SchemaAndRulesViewer />
            )}

            {/* VIEW: LOG AKTIVITAS & AUDIT TRAIL (Khusus Role Admin) */}
            {activeTab === 'activity_logs' && currentUser.role === 'admin' && (
              <ActivityLogViewer currentUserRole={currentUser.role} />
            )}

            {/* FALLBACK VIEW IF NO TAB MATCHES (PREVENT BLANK WHITE SCREEN) */}
            {!isTabAllowedForRole(activeTab, currentUser.role) && (
              currentUser.role === 'siswa' || currentUser.role === 'orang_tua' ? (
                <StudentPortal currentUser={currentUser} />
              ) : currentUser.role === 'wali_kelas' ? (
                <HomeroomDashboard
                  currentClassId="class_10_ipa1"
                  userRole={currentUser.role}
                  studentList={students.map(s => ({ id: s.id, nama: s.nama }))}
                />
              ) : (
                <DashboardOverview
                  currentUser={currentUser}
                  clock={clock}
                  students={students}
                  classes={classes}
                  subjects={subjects}
                  attendanceRate={attendanceRate}
                  hCount={hCount}
                  iCount={iCount}
                  sCount={sCount}
                  aCount={aCount}
                  onNavigateTab={(tab) => {
                    setActiveTab(tab);
                    scrollToTop();
                  }}
                />
              )
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FOOTER: Nama Pembuat (Dapat diedit di menu admin) */}
      <footer className="mt-8 py-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 mb-14 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              {appSettings.appName} • Dibuat oleh <strong className="text-slate-800 dark:text-slate-200 font-semibold">{appSettings.creatorName || 'Puput Sasmita'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>{appSettings.appDescription}</span>
            <span>•</span>
            <span>Versi 3.2</span>
          </div>
        </div>
      </footer>

      {/* FLOATING BACK TO TOP BUTTON (RESPONSIF & BEBAS TABRAKAN) */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center group cursor-pointer"
          title="Kembali ke atas"
          aria-label="Kembali ke atas"
        >
          <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* ===================================================================== */}
      {/* SMARTPHONE NATIVE ANDROID BOTTOM NAVIGATION BAR                       */}
      {/* ===================================================================== */}
      <AndroidBottomNav
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          scrollToTop();
        }}
        onOpenDrawer={() => setIsAndroidDrawerOpen(true)}
        isDrawerOpen={isAndroidDrawerOpen}
      />

      {/* ===================================================================== */}
      {/* SMARTPHONE ANDROID APP DRAWER & LAUNCHER (CATEGORIZED & SEARCHABLE)   */}
      {/* ===================================================================== */}
      <AndroidAppDrawer
        isOpen={isAndroidDrawerOpen}
        onClose={() => setIsAndroidDrawerOpen(false)}
        currentUser={currentUser}
        appSettings={appSettings}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          scrollToTop();
        }}
        onLogout={handleLogout}
        onResetData={handleResetData}
        remainingTimeFormatted={remainingTimeFormatted}
      />

      {/* ===================================================================== */}
      {/* MODAL KONFIRMASI KELUAR APLIKASI (CEGAH TIDAK SENGAJA KELUAR)         */}
      {/* ===================================================================== */}
      <ExitAppConfirmModal
        isOpen={showExitConfirmModal}
        onStayInApp={() => setShowExitConfirmModal(false)}
        onConfirmExit={() => {
          setShowExitConfirmModal(false);
          performDirectLogout();
        }}
        appName={appSettings.appName}
      />
    </div>
  );
}
