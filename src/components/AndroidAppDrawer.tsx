import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  CalendarCheck2,
  Award,
  School,
  HardDrive,
  Users,
  Settings,
  Megaphone,
  Database,
  History,
  GraduationCap,
  Search,
  X,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  RotateCcw,
  LogOut,
  Moon,
  Sun,
  Bell,
  Clock,
  ExternalLink,
  Layers,
  FolderLock
} from 'lucide-react';
import { User, AppSettings, UserRole } from '../types';
import { TourService } from '../services/tourService';
import { realtimeNotificationService } from '../services/realtimeNotificationService';
import { navigationBackService } from '../services/navigationBackService';
import { useTheme } from '../utils/useTheme';

interface AndroidAppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  appSettings: AppSettings;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  onResetData: () => void;
  remainingTimeFormatted: string;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

interface DrawerFeatureItem {
  id: string;
  title: string;
  category: 'akademik' | 'manajemen' | 'sistem';
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badge?: string;
  badgeColor?: string;
  allowedRoles: UserRole[];
}

export const AndroidAppDrawer: React.FC<AndroidAppDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  appSettings,
  activeTab,
  onSelectTab,
  onLogout,
  onResetData,
  remainingTimeFormatted,
  isDarkMode,
  onToggleTheme
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'akademik' | 'manajemen' | 'sistem'>('all');

  const { isDark: localIsDark, toggleTheme: localToggleTheme } = useTheme();
  const effectiveIsDark = isDarkMode !== undefined ? isDarkMode : localIsDark;
  const handleToggleTheme = onToggleTheme || localToggleTheme;

  const allFeatures: DrawerFeatureItem[] = useMemo(() => [
    // 1. KATEGORI AKADEMIK & PEMBELAJARAN
    {
      id: 'dashboard',
      title: 'Dasbor Utama',
      category: 'akademik',
      description: 'Ringkasan performa siswa, statistik kehadiran, dan grafik komparasi semester',
      icon: TrendingUp,
      iconBg: 'bg-blue-100 dark:bg-blue-950/80',
      iconColor: 'text-blue-600 dark:text-blue-400',
      allowedRoles: ['admin', 'wali_kelas', 'guru', 'siswa', 'orang_tua']
    },
    {
      id: 'attendance',
      title: 'Presensi Siswa & QR',
      category: 'akademik',
      description: 'Lapor kehadiran harian, scanner QR Code, filter rentang tanggal & bukti swafoto',
      icon: CalendarCheck2,
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/80',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      badge: 'QR Scanner',
      badgeColor: 'bg-emerald-500 text-white',
      allowedRoles: ['admin', 'wali_kelas', 'guru']
    },
    {
      id: 'grades',
      title: 'Nilai & Rapor Akademik',
      category: 'akademik',
      description: 'Input skor tugas/UH/PTS/PAS, ekspor rapor PDF kop sekolah, dan ekspor Excel .xlsx',
      icon: Award,
      iconBg: 'bg-indigo-100 dark:bg-indigo-950/80',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      badge: 'PDF + Excel',
      badgeColor: 'bg-indigo-500 text-white',
      allowedRoles: ['admin', 'wali_kelas', 'guru']
    },
    {
      id: 'homeroom',
      title: 'Administrasi Wali Kelas',
      category: 'akademik',
      description: '18 fitur terpadu: rekapitulasi nilai, catatan sikap, bimbingan konseling, dan peringkat kelas',
      icon: School,
      iconBg: 'bg-violet-100 dark:bg-violet-950/80',
      iconColor: 'text-violet-600 dark:text-violet-400',
      badge: '18 Fitur',
      badgeColor: 'bg-violet-600 text-white',
      allowedRoles: ['admin', 'wali_kelas']
    },
    {
      id: 'student_portal',
      title: currentUser.role === 'orang_tua' ? 'Portal Wali Murid' : 'Portal Siswa',
      category: 'akademik',
      description: 'Akses kartu hasil studi, riwayat absensi berkala, dan jadwal pembelajaran',
      icon: GraduationCap,
      iconBg: 'bg-sky-100 dark:bg-sky-950/80',
      iconColor: 'text-sky-600 dark:text-sky-400',
      allowedRoles: ['siswa', 'orang_tua']
    },

    // 2. KATEGORI MANAJEMEN & ADMINISTRASI
    {
      id: 'users',
      title: 'Manajemen Pengguna (User)',
      category: 'manajemen',
      description: 'Kelola akun siswa, guru, wali murid; batch action hapus & ubah peran massal',
      icon: Users,
      iconBg: 'bg-amber-100 dark:bg-amber-950/80',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badge: 'Batch Action',
      badgeColor: 'bg-amber-500 text-white',
      allowedRoles: ['admin']
    },
    {
      id: 'drive_photos',
      title: 'Database Foto Siswa (Drive)',
      category: 'manajemen',
      description: 'Integrasi penyimpanan Google Drive untuk foto profil dan arsip digital siswa',
      icon: HardDrive,
      iconBg: 'bg-orange-100 dark:bg-orange-950/80',
      iconColor: 'text-orange-600 dark:text-orange-400',
      allowedRoles: ['admin']
    },
    {
      id: 'running_text',
      title: 'Running Text Pengumuman',
      category: 'manajemen',
      description: 'Kelola teks berjalan pada halaman login untuk info penting instansi',
      icon: Megaphone,
      iconBg: 'bg-teal-100 dark:bg-teal-950/80',
      iconColor: 'text-teal-600 dark:text-teal-400',
      allowedRoles: ['admin']
    },
    {
      id: 'app_settings',
      title: 'Identitas & Logo Sekolah',
      category: 'manajemen',
      description: 'Pengaturan nama instansi, logo kustom, alamat sekolah, dan kop surat rapor',
      icon: Settings,
      iconBg: 'bg-cyan-100 dark:bg-cyan-950/80',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      allowedRoles: ['admin']
    },

    // 3. KATEGORI SISTEM & KEAMANAN
    {
      id: 'architecture',
      title: 'Skema Database & Rules',
      category: 'sistem',
      description: 'Struktur entitas Firebase Firestore, simulasi snapshot, dan matriks RBAC',
      icon: Database,
      iconBg: 'bg-purple-100 dark:bg-purple-950/80',
      iconColor: 'text-purple-600 dark:text-purple-400',
      allowedRoles: ['admin']
    },
    {
      id: 'activity_logs',
      title: 'Log Aktivitas & Audit Trail',
      category: 'sistem',
      description: 'Rekam jejak perubahan data, riwayat login, dan audit keamanan sistem',
      icon: History,
      iconBg: 'bg-rose-100 dark:bg-rose-950/80',
      iconColor: 'text-rose-600 dark:text-rose-400',
      badge: 'Audit',
      badgeColor: 'bg-rose-500 text-white',
      allowedRoles: ['admin']
    }
  ], [currentUser.role]);

  // Filter features based on user role, category filter, and search query
  const accessibleFeatures = useMemo(() => {
    return allFeatures.filter(f => f.allowedRoles.includes(currentUser.role));
  }, [allFeatures, currentUser.role]);

  const filteredFeatures = useMemo(() => {
    return accessibleFeatures.filter(item => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        (item.badge && item.badge.toLowerCase().includes(query));
      return matchCategory && matchQuery;
    });
  }, [accessibleFeatures, selectedCategory, searchQuery]);

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'wali_kelas': return 'Wali Kelas';
      case 'guru': return 'Guru Pengajar';
      case 'siswa': return 'Siswa Aktif';
      case 'orang_tua': return 'Wali Murid';
      default: return String(role);
    }
  };

  const handleSelect = (tabId: string) => {
    onSelectTab(tabId);
    onClose();
  };

  // Intercept tombol kembali perangkat ketika drawer menu sedang terbuka
  useEffect(() => {
    if (!isOpen) return;
    const unregister = navigationBackService.registerHandler('android_app_drawer', () => {
      onClose();
      return true;
    });
    return () => unregister();
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          {/* Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Android Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full max-h-[88vh] bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl border-t border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden z-10"
          >
            {/* Android Drag Handle */}
            <div className="w-full pt-3 pb-1.5 flex justify-center cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>

            {/* Android App Header */}
            <div className="px-5 pt-2 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-black text-base shadow-sm">
                    {currentUser.nama.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
                      {currentUser.nama}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-full">
                        {getRoleDisplayName(currentUser.role)}
                      </span>
                      <span className="text-[10px] text-slate-400">• Sesi: {remainingTimeFormatted}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-close-drawer-kembali"
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs"
                  aria-label="Kembali ke Aplikasi (Tutup Menu)"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
              </div>

              {/* Android Search Bar */}
              <div className="relative mt-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari fitur aplikasi SIMAK..."
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills (Material You Chip Filter) */}
              <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all', label: `Semua (${accessibleFeatures.length})` },
                  { id: 'akademik', label: 'Akademik' },
                  { id: 'manajemen', label: 'Manajemen' },
                  { id: 'sistem', label: 'Sistem' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Grid / List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-h-[50vh]">
              {filteredFeatures.length === 0 ? (
                <div className="py-10 text-center text-slate-400 dark:text-slate-500">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">Fitur tidak ditemukan</p>
                  <p className="text-[11px] mt-1">Coba kata kunci lain atau pilih tab Semua.</p>
                </div>
              ) : (
                filteredFeatures.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${item.iconBg}`}>
                        <Icon className={`w-5 h-5 ${item.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold truncate ${
                            isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'
                          }`}>
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                      }`} />
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick Android Actions Dock */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <div className="grid grid-cols-4 gap-2">
                {/* 1. Dark Mode Toggle */}
                <button
                  onClick={handleToggleTheme}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/60 transition cursor-pointer"
                  title="Ganti Tema Gelap / Terang"
                >
                  {effectiveIsDark ? <Sun className="w-4 h-4 text-amber-500 mb-1" /> : <Moon className="w-4 h-4 text-slate-700 mb-1" />}
                  <span className="text-[10px] font-semibold">{effectiveIsDark ? 'Terang' : 'Gelap'}</span>
                </button>

                {/* 2. Push Notification Prompt */}
                <button
                  onClick={async () => {
                    await realtimeNotificationService.requestBrowserNotificationPermission();
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/60 transition cursor-pointer"
                  title="Aktifkan Notifikasi Peramban"
                >
                  <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1" />
                  <span className="text-[10px] font-semibold">Push Notif</span>
                </button>

                {/* 3. Panduan Tour */}
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(() => {
                      TourService.getInstance().startTour(
                        currentUser,
                        appSettings.appName,
                        (tab) => onSelectTab(tab),
                        true
                      );
                    }, 300);
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/60 transition cursor-pointer"
                  title="Mulai Panduan Aplikasi"
                >
                  <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mb-1" />
                  <span className="text-[10px] font-semibold">Panduan</span>
                </button>

                {/* 4. Logout */}
                <button
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 shadow-2xs hover:bg-rose-100 dark:hover:bg-rose-900/80 transition cursor-pointer"
                  title="Keluar dari akun"
                >
                  <LogOut className="w-4 h-4 mb-1" />
                  <span className="text-[10px] font-bold">Keluar</span>
                </button>
              </div>

              {/* Reset Data Button (Only for Admin) */}
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => {
                    onClose();
                    onResetData();
                  }}
                  className="w-full mt-2.5 py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset Database Demo</span>
                </button>
              )}

              {/* Kembali ke Aplikasi (Batal) Button */}
              <button
                type="button"
                id="btn-drawer-batal-kembali"
                onClick={onClose}
                className="w-full mt-2.5 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition cursor-pointer active:scale-99"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Aplikasi (Batal)</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
