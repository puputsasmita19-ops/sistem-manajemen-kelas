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
import { MasterAcademicData } from './components/MasterAcademicData';
import { SecurityAntiCheatManager } from './components/SecurityAntiCheatManager';
import { ScheduledExportManager } from './components/ScheduledExportManager';
import { DesktopSidebar } from './components/DesktopSidebar';
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
  ArrowLeft,
  CalendarClock
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
    'master_academic',
    'users',
    'scheduled_exports',
    'app_settings',
    'running_text',
    'kop_settings',
    'drive_photos',
    'architecture',
    'security_settings',
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('SIMAK_DESKTOP_SIDEBAR_COLLAPSED') === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('SIMAK_DESKTOP_SIDEBAR_COLLAPSED', String(next));
      } catch (e) {}
      return next;
    });
  };

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
  const [tabResetKey, setTabResetKey] = useState<number>(0);
  const [appSettingsSubTab, setAppSettingsSubTab] = useState<'general' | 'logo' | 'running_text' | 'kop_signature' | 'security'>(() => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash === 'running_text') return 'running_text';
      if (hash === 'kop_settings') return 'kop_signature';
    } catch (e) {}
    return 'general';
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      return resolveValidTab(hash, currentUser);
    } catch (e) {
      return currentUser ? getDefaultTabForRole(currentUser.role) : 'login';
    }
  });

  // Handler navigasi terpadu yang menyinkronkan sub-tab dan highlight menu sidebar
  const handleSelectTab = (tab: string, subTab?: 'general' | 'logo' | 'running_text' | 'kop_signature' | 'security') => {
    if (tab === 'app_settings') {
      setAppSettingsSubTab(subTab || 'general');
    } else if (tab === 'running_text') {
      setAppSettingsSubTab('running_text');
    } else if (tab === 'kop_settings') {
      setAppSettingsSubTab('kop_signature');
    }
    setActiveTab(tab);
    setTabResetKey((prev) => prev + 1);
    scrollToTop();
  };

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
        if (hash === 'running_text') {
          setAppSettingsSubTab('running_text');
        } else if (hash === 'app_settings') {
          setAppSettingsSubTab('general');
        }
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

  // Save active tab whenever it changes & update URL hash
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

      // Smoothly bring the active tab button into center view in sidebar or drawer
      setTimeout(() => {
        const activeBtn = document.getElementById(`tab-${activeTab.replace(/_/g, '-')}`);
        if (activeBtn) {
          activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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

  const getTabDetails = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return { title: 'Dasbor Utama', category: 'Akademik & Performa', icon: TrendingUp };
      case 'attendance':
        return { title: 'Presensi Siswa & QR', category: 'Akademik', icon: CalendarCheck2 };
      case 'grades':
        return { title: 'Nilai & Rapor', category: 'Akademik', icon: Award };
      case 'homeroom':
        return { title: 'Administrasi Wali Kelas', category: '18 Fitur Terintegrasi', icon: School };
      case 'student_portal':
        return {
          title: currentUser?.role === 'orang_tua' ? 'Portal Wali Murid' : 'Portal Siswa',
          category: 'Portal Informasi',
          icon: GraduationCap
        };
      case 'master_academic':
        return { title: 'Master Data Akademik', category: 'Manajemen Data', icon: GraduationCap };
      case 'drive_photos':
        return { title: 'Database Foto Siswa (Google Drive)', category: 'Manajemen Data', icon: HardDrive };
      case 'users':
        return { title: 'Manajemen Akun Pengguna', category: 'Manajemen Sistem', icon: Users };
      case 'scheduled_exports':
        return { title: 'Jadwal Ekspor Otomatis & Arsip Cloud', category: 'Manajemen Data & Cloud', icon: CalendarClock };
      case 'app_settings':
        return { title: 'Identitas & Logo Sekolah', category: 'Pengaturan Sistem', icon: Settings };
      case 'running_text':
        return { title: 'Running Text Halaman Login', category: 'Kustomisasi Teks', icon: Megaphone };
      case 'kop_settings':
        return { title: 'Pengaturan Kertas, Kop & Tanda Tangan', category: 'Pengaturan Dokumen Cetak', icon: FileText };
      case 'architecture':
        return { title: 'Firebase & Database', category: 'Sistem & Keamanan Cloud', icon: Database };
      case 'security_settings':
        return { title: 'Keamanan & Anti-Cheat', category: 'Sistem & Keamanan', icon: ShieldCheck };
      case 'activity_logs':
        return { title: 'Log Aktivitas & Audit Trail', category: 'Audit Keamanan', icon: History };
      default:
        return { title: 'Dasbor Utama', category: 'Akademik', icon: TrendingUp };
    }
  };

  const activeTabDetails = getTabDetails(activeTab);
  const ActiveTabIcon = activeTabDetails.icon;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* SMARTPHONE TOP APP BAR (PENGALAMAN APLIKASI ANDROID NATIVE - HANYA PADA MOBILE) */}
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

      {/* ===================================================================== */}
      {/* DESKTOP SIDEBAR MENU (MENU BERADA DI SEBELAH KIRI LAYAKNYA WEBSITE)  */}
      {/* ===================================================================== */}
      <DesktopSidebar
        appSettings={appSettings}
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        clock={clock}
        remainingTimeFormatted={remainingTimeFormatted}
        onLogout={handleLogout}
        onResetData={handleResetData}
        onOpenTour={() => {
          TourService.getInstance().startTour(
            currentUser,
            appSettings.appName,
            (tab) => handleSelectTab(tab),
            true
          );
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* ===================================================================== */}
      {/* DESKTOP RIGHT MAIN CONTENT WRAPPER                                   */}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* DESKTOP TOP APPLICATION BAR */}
        <header className="hidden md:flex items-center justify-between px-6 lg:px-8 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-200 shadow-2xs">
          {/* Left: Active Page Icon (Clean icon only when sidebar expanded; icon + running text title when sidebar collapsed) */}
          <div className="flex items-center gap-3 min-w-0 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
            <div
              className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs shrink-0"
              title={activeTabDetails.title}
              aria-label={activeTabDetails.title}
            >
              <ActiveTabIcon className="w-5 h-5" />
            </div>
            {isSidebarCollapsed && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <RunningText
                  text={activeTabDetails.title}
                  maxLength={18}
                  maxWidthClass="w-full"
                  className="text-base font-bold text-slate-900 dark:text-white tracking-tight"
                  speed={10}
                />
              </div>
            )}
          </div>

          {/* Right: Status Badges, Clock, Security & Quick Actions */}
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            {/* Active User Running Status */}
            <div className="hidden xl:inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 px-3 py-1.5 rounded-full shadow-2xs max-w-xs overflow-hidden">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="overflow-hidden min-w-0 max-w-[200px]">
                <RunningText
                  text={`${currentUser.nama} • ${getRoleDisplayName(currentUser.role)}`}
                  maxLength={24}
                  maxWidthClass="w-full"
                  className="text-xs font-semibold text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Badges for Clock & Date */}
            <div
              className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs"
              title={`Waktu Realtime: ${clock.timeFormatted} • ${clock.dateFormatted}`}
            >
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-black dark:text-white shrink-0" />
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {clock.timeFormatted}
                </span>
              </div>
              <span className="text-slate-300 dark:text-slate-600 hidden lg:inline">•</span>
              <div className="hidden lg:flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-black dark:text-white shrink-0" />
                <span className="whitespace-nowrap text-xs">{clock.dateFormatted}</span>
              </div>
            </div>

            {/* Firebase Sync Status Badge (Admin Only) */}
            {currentUser.role === 'admin' && <FirebaseStatusBadge currentUser={currentUser} />}
            <OfflineIndicator />
          </div>
        </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl 2xl:max-w-[1600px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
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
              <UserManagement onNavigateTab={handleSelectTab} />
            )}

            {/* VIEW: IDENTITAS & LOGO APLIKASI (Khusus Role Admin) */}
            {activeTab === 'app_settings' && currentUser.role === 'admin' && (
              <AppSettingsManager
                currentMainTab="app_settings"
                initialTab={appSettingsSubTab !== 'running_text' ? appSettingsSubTab : 'general'}
                tabResetKey={tabResetKey}
                onNavigateTab={handleSelectTab}
                onSettingsSaved={(saved) => setAppSettings(saved)}
              />
            )}

            {/* VIEW: EDIT RUNNING TEXT LOGIN (Khusus Role Admin) */}
            {activeTab === 'running_text' && currentUser.role === 'admin' && (
              <AppSettingsManager
                currentMainTab="running_text"
                initialTab="running_text"
                tabResetKey={tabResetKey}
                onNavigateTab={handleSelectTab}
                onSettingsSaved={(saved) => setAppSettings(saved)}
              />
            )}

            {/* VIEW: PENGATURAN KERTAS, KOP & TANDA TANGAN (Khusus Role Admin) */}
            {activeTab === 'kop_settings' && currentUser.role === 'admin' && (
              <AppSettingsManager
                currentMainTab="kop_settings"
                initialTab="kop_signature"
                tabResetKey={tabResetKey}
                onNavigateTab={handleSelectTab}
                onSettingsSaved={(saved) => setAppSettings(saved)}
              />
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

            {/* VIEW: MASTER DATA AKADEMIK (Khusus Role Admin) */}
            {activeTab === 'master_academic' && currentUser.role === 'admin' && (
              <MasterAcademicData currentUser={currentUser} />
            )}

            {/* VIEW: JADWAL EKSPOR OTOMATIS & ARSIP CLOUD (Khusus Role Admin) */}
            {activeTab === 'scheduled_exports' && currentUser.role === 'admin' && (
              <ScheduledExportManager />
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

            {/* VIEW: KEAMANAN & ANTI-CHEAT (Menu Sistem & Keamanan - Khusus Role Admin) */}
            {activeTab === 'security_settings' && currentUser.role === 'admin' && (
              <SecurityAntiCheatManager
                appSettings={appSettings}
                currentUser={currentUser}
                onUpdateSettings={(newSettings) => {
                  setAppSettings(newSettings);
                  DatabaseService.getInstance().updateAppSettings(newSettings);
                  DatabaseService.getInstance().logActivity(
                    'settings_update',
                    'Pembaruan Sistem Keamanan',
                    'Memperbarui konfigurasi sistem keamanan & anti-cheat',
                    'security_settings'
                  );
                }}
              />
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
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
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
      </div>

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
        onSelectTab={handleSelectTab}
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
        onSelectTab={handleSelectTab}
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
