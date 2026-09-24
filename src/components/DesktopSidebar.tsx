import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  CalendarCheck2,
  Award,
  School,
  BookOpen,
  HardDrive,
  Users,
  Settings,
  Megaphone,
  Database,
  History,
  GraduationCap,
  LogOut,
  RotateCcw,
  Sparkles,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CalendarClock,
  FileText,
  Search,
  Code2,
  ArrowRight,
  GripVertical,
  Sliders,
  Check,
  Move,
  ArrowUp,
  ArrowDown,
  Info,
  Sparkle
} from 'lucide-react';
import { AppSettings, User, UserRole } from '../types';
import { AppLogo } from './AppLogo';
import { ThemeToggle } from './ThemeToggle';
import { DatabaseService } from '../services/databaseService';
import Swal from 'sweetalert2';

interface DesktopSidebarProps {
  appSettings: AppSettings;
  currentUser: User;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  clock?: {
    timeFormatted?: string;
    dateFormatted?: string;
  };
  remainingTimeFormatted?: string;
  onLogout: () => void;
  onResetData: () => void;
  onOpenTour: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCommandPalette?: () => void;
}

export interface NavSectionItem {
  id: string;
  label: string;
  description?: string;
  featureHighlights?: string[];
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  allowedRoles: UserRole[];
}

export interface NavSection {
  id: string;
  title: string;
  items: NavSectionItem[];
}

// Master default menu sections
const DEFAULT_NAV_SECTIONS: NavSection[] = [
  {
    id: 'section_academic',
    title: 'Menu Utama & Akademik',
    items: [
      {
        id: 'dashboard',
        label: 'Dasbor Utama',
        description: 'Ringkasan statistik sekolah, grafik presensi harian, dan aktivitas terkini',
        featureHighlights: ['Statistik Siswa & Guru', 'Grafik Absensi', 'Aktivitas Terkini'],
        icon: TrendingUp,
        allowedRoles: ['admin', 'wali_kelas', 'guru', 'siswa', 'orang_tua']
      },
      {
        id: 'student_portal',
        label: 'Portal Siswa & Wali',
        description: 'Biodata profil, jadwal pelajaran, riwayat kehadiran, dan rapor siswa',
        featureHighlights: ['Kartu Rapor Digital', 'Rekap Presensi Pribadi', 'Jadwal KBM'],
        icon: GraduationCap,
        allowedRoles: ['siswa', 'orang_tua']
      },
      {
        id: 'attendance',
        label: 'Presensi Siswa',
        description: 'Absensi harian, foto selfie siswa, radius GPS sekolah, dan rekap kelas',
        featureHighlights: ['Foto Selfie & GPS', 'Filter Rombel', 'Ekspor Excel Absen'],
        icon: CalendarCheck2,
        allowedRoles: ['admin', 'wali_kelas', 'guru']
      },
      {
        id: 'grades',
        label: 'Nilai & Rapor',
        description: 'Input nilai tugas, formatif, sumatif, cetak rapor, dan ledger nilai',
        featureHighlights: ['Formatif & Sumatif', 'Cetak Rapor Kurikulum', 'Ledger Nilai'],
        icon: Award,
        allowedRoles: ['admin', 'wali_kelas', 'guru']
      },
      {
        id: 'teacher_journal',
        label: 'Jurnal Mengajar Guru',
        description: 'Pencatatan kegiatan KBM, materi pelajaran, kompetensi, dan agenda kelas',
        featureHighlights: ['Agenda KBM Harian', 'Catatan Pembelajaran', 'Presensi Jam Mapel'],
        icon: BookOpen,
        badge: 'Input KBM',
        badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        allowedRoles: ['admin', 'wali_kelas', 'guru']
      },
      {
        id: 'homeroom',
        label: 'Menu Wali Kelas',
        description: 'Rekap absensi rombel, catatan wali kelas, perkembangan dan rapor binaan',
        featureHighlights: ['Rekap Kelas Binaan', 'Catatan Karakter Siswa', 'Cetak Rapor Massal'],
        icon: School,
        allowedRoles: ['admin', 'wali_kelas']
      }
    ]
  },
  {
    id: 'section_data_management',
    title: 'Manajemen Data',
    items: [
      {
        id: 'master_academic',
        label: 'Master Akademik',
        description: 'Pengaturan Tahun Ajaran aktif, Semester, Rombongan Belajar, dan Mapel',
        featureHighlights: ['Tahun Ajaran & Semester', 'Daftar Rombel / Kelas', 'Mata Pelajaran'],
        icon: GraduationCap,
        allowedRoles: ['admin']
      },
      {
        id: 'drive_photos',
        label: 'Foto Google Drive',
        description: 'Arsip foto presensi selfie siswa dan pasfoto resmi di Cloud Storage',
        featureHighlights: ['Galeri Selfie Siswa', 'Sinkron Cloud Storage', 'Penyimpanan Aman'],
        icon: HardDrive,
        allowedRoles: ['admin']
      },
      {
        id: 'users',
        label: 'Manajemen Pengguna',
        description: 'Kelola akun Guru, Siswa, Wali Kelas, Orang Tua, import Excel & reset password',
        featureHighlights: ['Multi-Peran RBAC', 'Import Siswa via Excel', 'Reset Password Cepat'],
        icon: Users,
        allowedRoles: ['admin']
      },
      {
        id: 'scheduled_exports',
        label: 'Jadwal Ekspor & Cloud',
        description: 'Otomatisasi pencadangan data akademik berkala ke spreadsheet dan cloud',
        featureHighlights: ['Jadwal Otomatis', 'Ekspor Multi-Format', 'Cadangan Cloud'],
        icon: CalendarClock,
        badge: 'Otomatis',
        badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        allowedRoles: ['admin']
      }
    ]
  },
  {
    id: 'section_settings',
    title: 'Pengaturan & Teks',
    items: [
      {
        id: 'app_settings',
        label: 'Identitas & Logo',
        description: 'Nama sekolah, logo instansi, favicon, warna tema, dan alamat resmi',
        featureHighlights: ['Upload Logo & Favicon', 'Kustomisasi Tema', 'Info Instansi'],
        icon: Settings,
        allowedRoles: ['admin']
      },
      {
        id: 'running_text',
        label: 'Running Text',
        description: 'Pengaturan teks pengumuman bergerak di portal siswa dan header aplikasi',
        featureHighlights: ['Pesan Dinamis', 'Sapaan Waktu Otomatis', 'Pengumuman Penting'],
        icon: Megaphone,
        allowedRoles: ['admin']
      },
      {
        id: 'kop_settings',
        label: 'Kop & Tanda Tangan',
        description: 'Tata letak kop surat resmi kedinasan, ukuran kertas margin, dan tanda tangan digital',
        featureHighlights: ['Kop Surat Dinas', 'Ukuran Kertas A4/F4', 'TTD Kepala Sekolah'],
        icon: FileText,
        allowedRoles: ['admin']
      }
    ]
  },
  {
    id: 'section_system_security',
    title: 'Sistem & Keamanan',
    items: [
      {
        id: 'architecture',
        label: 'Firebase & Database',
        description: 'Status koneksi Cloud Firestore, sinkronisasi cloud real-time, dan replikasi data',
        featureHighlights: ['Cloud Firestore Status', 'Push/Pull Replikasi', 'Backup & Restore'],
        icon: Database,
        allowedRoles: ['admin']
      },
      {
        id: 'security_settings',
        label: 'Keamanan & Anti-Cheat',
        description: 'Proteksi radius GPS, pencegahan Fake GPS / Mock Location, dan enkripsi sesi',
        featureHighlights: ['Radius Geofencing GPS', 'Deteksi Mock Location', 'Anti-DevTools & Cheat'],
        icon: ShieldCheck,
        allowedRoles: ['admin']
      },
      {
        id: 'activity_logs',
        label: 'Log Aktivitas',
        description: 'Audit trail rekam jejak pengguna, histori login, dan riwayat manipulasi data',
        featureHighlights: ['Audit Trail Pengguna', 'Riwayat Perubahan Data', 'Timestamp Realtime'],
        icon: History,
        allowedRoles: ['admin']
      }
    ]
  }
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  appSettings,
  currentUser,
  activeTab,
  onSelectTab,
  clock,
  remainingTimeFormatted,
  onLogout,
  onResetData,
  onOpenTour,
  isCollapsed,
  onToggleCollapse,
  onOpenCommandPalette
}) => {
  const dbService = DatabaseService.getInstance();
  const role = currentUser.role;

  // Storage key for custom drag-and-drop menu order per user/role
  const storageKey = `SIMAK_SIDEBAR_MENU_ORDER_V2_${currentUser.id || currentUser.role}`;

  // State for menu structure
  const [navSections, setNavSections] = useState<NavSection[]>(() => {
    try {
      const savedOrder = localStorage.getItem(storageKey);
      if (savedOrder) {
        const orderMap: Record<string, string[]> = JSON.parse(savedOrder);
        // Reconstruct sections with saved ordering
        return DEFAULT_NAV_SECTIONS.map((section) => {
          const savedItemIds = orderMap[section.id];
          if (!savedItemIds || !Array.isArray(savedItemIds)) return section;

          const itemMap = new Map(section.items.map((it) => [it.id, it]));
          const reorderedItems: NavSectionItem[] = [];

          // Add existing saved items
          savedItemIds.forEach((id) => {
            if (itemMap.has(id)) {
              reorderedItems.push(itemMap.get(id)!);
              itemMap.delete(id);
            }
          });

          // Append any newly added default items that were not in saved order
          itemMap.forEach((it) => reorderedItems.push(it));

          return {
            ...section,
            items: reorderedItems
          };
        });
      }
    } catch (e) {
      console.warn('Failed to load customized sidebar order:', e);
    }
    return DEFAULT_NAV_SECTIONS;
  });

  // Reorder mode state for drag-and-drop & visual customization
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);

  // Drag and Drop state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // Quick-View Popover Hover & Positioning State
  const [hoveredItem, setHoveredItem] = useState<{
    item: NavSectionItem;
    sectionTitle: string;
    rect: DOMRect;
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detail peran / tugas
  const assignedClass = role === 'wali_kelas' ? dbService.getHomeroomClass(currentUser.id) : null;
  const teacherSubjects = role === 'guru' ? dbService.getSubjectsByTeacher(currentUser.id) : [];
  const studentClass = role === 'siswa' ? dbService.getStudentClass(currentUser.id) : null;

  // Save customized menu order to localStorage
  const saveMenuOrder = (updatedSections: NavSection[]) => {
    try {
      const orderMap: Record<string, string[]> = {};
      updatedSections.forEach((sec) => {
        orderMap[sec.id] = sec.items.map((it) => it.id);
      });
      localStorage.setItem(storageKey, JSON.stringify(orderMap));
      setNavSections(updatedSections);
    } catch (e) {
      console.error('Error saving menu order to localStorage:', e);
    }
  };

  // Reset menu order back to default
  const handleResetMenuOrder = () => {
    try {
      localStorage.removeItem(storageKey);
      setNavSections(DEFAULT_NAV_SECTIONS);
      setIsReorderMode(false);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Urutan menu dikembalikan ke default!',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (e) {
      console.error('Error resetting menu order:', e);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, sectionId: string, itemId: string) => {
    setDraggedItemId(itemId);
    setDraggedSectionId(sectionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ sectionId, itemId }));
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverItemId !== itemId) {
      setDragOverItemId(itemId);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, itemId: string) => {
    if (dragOverItemId === itemId) {
      setDragOverItemId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string, targetItemId: string) => {
    e.preventDefault();
    setDragOverItemId(null);

    if (!draggedItemId || !draggedSectionId) return;

    // Reorder inside the same section or move to target section
    const updatedSections = navSections.map((section) => {
      // If moving within the same section
      if (section.id === draggedSectionId && section.id === targetSectionId) {
        const items = [...section.items];
        const fromIndex = items.findIndex((it) => it.id === draggedItemId);
        const toIndex = items.findIndex((it) => it.id === targetItemId);

        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          const [movedItem] = items.splice(fromIndex, 1);
          items.splice(toIndex, 0, movedItem);
          return { ...section, items };
        }
      }
      return section;
    });

    saveMenuOrder(updatedSections);
    setDraggedItemId(null);
    setDraggedSectionId(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDraggedSectionId(null);
    setDragOverItemId(null);
  };

  // Move item up/down manually via buttons (accessible reordering)
  const handleMoveItem = (sectionId: string, itemId: string, direction: 'up' | 'down') => {
    const updatedSections = navSections.map((section) => {
      if (section.id === sectionId) {
        const items = [...section.items];
        const index = items.findIndex((it) => it.id === itemId);
        if (index === -1) return section;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < items.length) {
          const [moved] = items.splice(index, 1);
          items.splice(targetIndex, 0, moved);
          return { ...section, items };
        }
      }
      return section;
    });

    saveMenuOrder(updatedSections);
  };

  // Quick-view Hover Handler with slight debounce for silky smooth UX
  const handleMouseEnterItem = (e: React.MouseEvent<HTMLElement>, item: NavSectionItem, sectionTitle: string) => {
    if (!isCollapsed) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();

    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem({ item, sectionTitle, rect });
    }, 60);
  };

  const handleMouseLeaveItem = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 120);
  };

  const getRoleDisplayName = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'Administrator';
      case 'wali_kelas':
        return 'Wali Kelas';
      case 'guru':
        return 'Guru Mapel';
      case 'siswa':
        return 'Siswa';
      case 'orang_tua':
        return 'Wali Murid';
      default:
        return String(r);
    }
  };

  const getRoleColorBadge = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'wali_kelas':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'guru':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'siswa':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'orang_tua':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getSectionTheme = (sectionId: string) => {
    switch (sectionId) {
      case 'section_academic':
        return {
          icon: GraduationCap,
          border: 'border-blue-200/90 dark:border-blue-800/80 border-l-4 border-l-blue-600 dark:border-l-blue-500',
          bg: 'bg-blue-50/70 dark:bg-blue-950/40',
          text: 'text-blue-950 dark:text-blue-200',
          iconColor: 'text-blue-600 dark:text-blue-400'
        };
      case 'section_data_management':
        return {
          icon: Database,
          border: 'border-emerald-200/90 dark:border-emerald-800/80 border-l-4 border-l-emerald-600 dark:border-l-emerald-500',
          bg: 'bg-emerald-50/70 dark:bg-emerald-950/40',
          text: 'text-emerald-950 dark:text-emerald-200',
          iconColor: 'text-emerald-600 dark:text-emerald-400'
        };
      case 'section_settings':
        return {
          icon: Settings,
          border: 'border-purple-200/90 dark:border-purple-800/80 border-l-4 border-l-purple-600 dark:border-l-purple-500',
          bg: 'bg-purple-50/70 dark:bg-purple-950/40',
          text: 'text-purple-950 dark:text-purple-200',
          iconColor: 'text-purple-600 dark:text-purple-400'
        };
      case 'section_system_security':
        return {
          icon: ShieldCheck,
          border: 'border-amber-200/90 dark:border-amber-800/80 border-l-4 border-l-amber-600 dark:border-l-amber-500',
          bg: 'bg-amber-50/70 dark:bg-amber-950/40',
          text: 'text-amber-950 dark:text-amber-200',
          iconColor: 'text-amber-600 dark:text-amber-400'
        };
      default:
        return {
          icon: Sliders,
          border: 'border-slate-200 dark:border-slate-700 border-l-4 border-l-slate-600 dark:border-l-slate-400',
          bg: 'bg-slate-100/80 dark:bg-slate-800/70',
          text: 'text-slate-900 dark:text-slate-100',
          iconColor: 'text-slate-600 dark:text-slate-400'
        };
    }
  };

  return (
    <aside
      id="desktop-sidebar-menu"
      className={`hidden md:flex flex-col shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen transition-all duration-300 z-40 select-none ${
        isCollapsed ? 'w-20' : 'w-64 lg:w-72'
      }`}
      aria-label="Menu Navigasi Desktop"
    >
      {/* 1. Header Sidebar: Logo & Nama Aplikasi */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5 min-h-[72px]">
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <AppLogo settings={appSettings} size={isCollapsed ? 'sm' : 'md'} />
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="min-w-0"
            >
              <h1 className="text-sm lg:text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                {appSettings.appName}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {appSettings.appDescription || 'Sistem Informasi Akademik'}
              </p>
            </motion.div>
          )}
        </div>

        {/* Toggle Collapse Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shrink-0 active:scale-95 shadow-2xs"
          title={isCollapsed ? 'Perlebar Menu' : 'Perkecil Menu'}
          aria-label={isCollapsed ? 'Perlebar Menu' : 'Perkecil Menu'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          )}
        </button>
      </div>

      {/* 2. Kartu Profil Pengguna Aktif & Toolbar Aksi Cepat */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            {/* Avatar Circle */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 uppercase ring-2 ring-blue-500/20">
              {currentUser.nama.substring(0, 2)}
            </div>
            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                  {currentUser.nama}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md border ${getRoleColorBadge(
                    currentUser.role
                  )}`}
                >
                  {getRoleDisplayName(currentUser.role)}
                </span>
                {assignedClass && (
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                    • {assignedClass.nama_kelas}
                  </span>
                )}
                {studentClass && (
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                    • {studentClass.nama_kelas}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs uppercase cursor-pointer hover:scale-105 transition-transform ring-2 ring-blue-500/20"
              title={`${currentUser.nama} (${getRoleDisplayName(currentUser.role)})`}
            >
              {currentUser.nama.substring(0, 2)}
            </div>
          </div>
        )}

        {/* Search (Ctrl+K) & Reorder Mode Toggle Buttons */}
        <div className="mt-2 flex items-center gap-1.5">
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className={`flex-1 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition shadow-2xs cursor-pointer group active:scale-98 ${
                isCollapsed ? 'p-2 justify-center' : 'px-3 py-1.5 text-xs font-semibold'
              }`}
              title="Pencarian Cepat Modul & Aksi (Ctrl + K)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
                {!isCollapsed && <span className="truncate">Cari Modul...</span>}
              </div>

              {!isCollapsed && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  <span>Ctrl</span>
                  <span>K</span>
                </span>
              )}
            </button>
          )}

          {/* Reorder Mode Button (Accessible Drag & Drop Reorder) */}
          {!isCollapsed && (currentUser.role === 'admin' || currentUser.role === 'wali_kelas' || currentUser.role === 'guru') && (
            <button
              type="button"
              onClick={() => setIsReorderMode((prev) => !prev)}
              className={`p-1.5 rounded-xl border transition cursor-pointer shrink-0 shadow-2xs flex items-center justify-center ${
                isReorderMode
                  ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/30'
                  : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-slate-700'
              }`}
              title={isReorderMode ? 'Selesai Mengatur Urutan Menu' : 'Sesuaikan Urutan Menu (Drag & Drop)'}
              aria-label="Atur Urutan Menu"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Reorder Mode Active Notification Bar */}
        {!isCollapsed && isReorderMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] flex items-center justify-between gap-1.5"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Move className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
              <span className="font-bold truncate">Mode Susun Menu Aktif</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleResetMenuOrder}
                className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-[10px] font-bold border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer"
                title="Kembalikan ke urutan awal"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsReorderMode(false)}
                className="px-1.5 py-0.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 text-[10px] font-bold shadow-2xs cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* 3. Daftar Menu Navigasi (Scrollable dengan Drag and Drop) */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {navSections.map((section, idx) => {
          const visibleItems = section.items.filter((item) =>
            item.allowedRoles.includes(currentUser.role)
          );

          if (visibleItems.length === 0) return null;

          const theme = getSectionTheme(section.id);
          const SectionIcon = theme.icon;

          return (
            <div key={section.id || section.title || idx} className="space-y-1.5">
              {/* Framed Section Header */}
              {!isCollapsed ? (
                <div
                  className={`px-2.5 py-1.5 rounded-xl border ${theme.border} ${theme.bg} flex items-center justify-between gap-1.5 shadow-2xs select-none`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SectionIcon className={`w-3.5 h-3.5 shrink-0 ${theme.iconColor}`} />
                    <h3 className={`text-[10.5px] font-black uppercase tracking-wider truncate ${theme.text}`}>
                      {section.title}
                    </h3>
                  </div>
                  {isReorderMode && (
                    <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/80 px-1.5 py-0.5 rounded-md shrink-0 border border-amber-300 dark:border-amber-700 animate-pulse">
                      Susun
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center my-1.5">
                  <div
                    className={`w-7 h-7 rounded-lg border ${theme.border.replace('border-l-4', 'border')} ${theme.bg} flex items-center justify-center shadow-2xs`}
                    title={section.title}
                  >
                    <SectionIcon className={`w-3.5 h-3.5 ${theme.iconColor}`} />
                  </div>
                </div>
              )}

              {/* Navigation Items (Drag and Drop Enabled) */}
              <div className="space-y-1">
                {visibleItems.map((item, itemIdx) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isDraggingThis = draggedItemId === item.id;
                  const isDragOverThis = dragOverItemId === item.id;

                  // Label display adjustments for roles
                  let displayLabel = item.label;
                  if (item.id === 'student_portal') {
                    displayLabel = role === 'orang_tua' ? 'Portal Wali Murid' : 'Portal Siswa';
                  }

                  return (
                    <div
                      key={item.id}
                      draggable={isReorderMode || (!isCollapsed && (currentUser.role === 'admin' || currentUser.role === 'wali_kelas' || currentUser.role === 'guru'))}
                      onDragStart={(e) => handleDragStart(e, section.id, item.id)}
                      onDragOver={(e) => handleDragOver(e, item.id)}
                      onDragLeave={(e) => handleDragLeave(e, item.id)}
                      onDrop={(e) => handleDrop(e, section.id, item.id)}
                      onDragEnd={handleDragEnd}
                      onMouseEnter={(e) => handleMouseEnterItem(e, item, section.title)}
                      onMouseLeave={handleMouseLeaveItem}
                      className={`relative transition-all duration-150 rounded-xl ${
                        isDraggingThis ? 'opacity-40 scale-95' : ''
                      } ${
                        isDragOverThis
                          ? 'ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50/50 dark:bg-blue-950/40 translate-y-0.5'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {/* Drag Handle in Reorder Mode */}
                        {!isCollapsed && isReorderMode && (
                          <div
                            className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
                            title="Tarik untuk memindahkan posisi"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                        )}

                        {/* Main Tab Button */}
                        <button
                          type="button"
                          id={`tab-${item.id.replace(/_/g, '-')}`}
                          onClick={() => {
                            onSelectTab(item.id);
                            setHoveredItem(null);
                          }}
                          className={`group relative flex-1 flex items-center gap-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                            isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'
                          } ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-500/40'
                              : 'text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:translate-x-0.5'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          {/* Icon with interactive micro-animations */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                              isActive
                                ? 'bg-white/20 text-white shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-950 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:scale-110'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          {/* Label & Badge when Expanded */}
                          {!isCollapsed && (
                            <div className="flex-1 flex items-center justify-between gap-1.5 min-w-0">
                              <span className="truncate tracking-tight">{displayLabel}</span>
                              {item.badge && (
                                <span
                                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
                                    isActive
                                      ? 'bg-white/25 text-white'
                                      : item.badgeColor || 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          )}
                        </button>

                        {/* Reorder Arrow Controls in Reorder Mode for precision without mouse dragging */}
                        {!isCollapsed && isReorderMode && (
                          <div className="flex flex-col gap-0.5 shrink-0 pr-1">
                            <button
                              type="button"
                              disabled={itemIdx === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveItem(section.id, item.id, 'up');
                              }}
                              className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Pindahkan ke atas"
                            >
                              <ArrowUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              disabled={itemIdx === visibleItems.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveItem(section.id, item.id, 'down');
                              }}
                              className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Pindahkan ke bawah"
                            >
                              <ArrowDown className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* 4. QUICK-VIEW POPOVER TOOLTIP (Ketika Sidebar Dalam Kondisi Collapse)  */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {isCollapsed && hoveredItem && (
          <div
            className="fixed z-[99999] pointer-events-auto"
            style={{
              left: `${hoveredItem.rect.right + 12}px`,
              top: `${Math.max(16, Math.min(window.innerHeight - 240, hoveredItem.rect.top - 12))}px`
            }}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={handleMouseLeaveItem}
          >
            <motion.div
              initial={{ opacity: 0, x: -8, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.95 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-3.5 text-left ring-1 ring-black/5"
            >
              {/* Arrow Indicator Pointer */}
              <div
                className="absolute -left-2 w-4 h-4 bg-white dark:bg-slate-900 border-l border-b border-slate-200 dark:border-slate-800 rotate-45"
                style={{
                  top: `${Math.max(16, Math.min(180, hoveredItem.rect.top - Math.max(16, Math.min(window.innerHeight - 240, hoveredItem.rect.top - 12)) + 14))}px`
                }}
              />

              {/* Header: Icon, Title & Section Badge */}
              <div className="relative flex items-center gap-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                  <hoveredItem.item.icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {hoveredItem.item.id === 'student_portal'
                        ? role === 'orang_tua'
                          ? 'Portal Wali Murid'
                          : 'Portal Siswa'
                        : hoveredItem.item.label}
                    </h4>
                    {hoveredItem.item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {hoveredItem.item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate block mt-0.5">
                    {hoveredItem.sectionTitle}
                  </span>
                </div>
              </div>

              {/* Module Description */}
              {hoveredItem.item.description && (
                <p className="relative text-[11px] text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                  {hoveredItem.item.description}
                </p>
              )}

              {/* Feature Highlights Tags */}
              {hoveredItem.item.featureHighlights && hoveredItem.item.featureHighlights.length > 0 && (
                <div className="relative mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-1">
                  {hoveredItem.item.featureHighlights.map((feat, fIdx) => (
                    <span
                      key={fIdx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                    >
                      <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                      <span>{feat}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Action Button to Open Tab */}
              <button
                type="button"
                onClick={() => {
                  onSelectTab(hoveredItem.item.id);
                  setHoveredItem(null);
                }}
                className="relative mt-3 w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-between transition cursor-pointer shadow-sm shadow-blue-500/20 active:scale-98"
              >
                <span>Buka Modul Ini</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Footer Sidebar: Quick Actions & Logout */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 space-y-2">
        {/* Action Buttons Row */}
        <div className={`flex items-center gap-1.5 ${isCollapsed ? 'flex-col' : 'justify-between'}`}>
          {/* Panduan Interaktif Tour */}
          <button
            type="button"
            onClick={onOpenTour}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs shrink-0 flex items-center justify-center active:scale-95"
            title="Panduan Interaktif Pengguna"
            aria-label="Panduan Interaktif"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Theme Toggle Button */}
          <div className="shrink-0 flex items-center justify-center">
            <ThemeToggle />
          </div>

          {/* Reset Database Button (Untuk Demo & Pengujian) */}
          <button
            type="button"
            onClick={onResetData}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs shrink-0 flex items-center justify-center active:scale-95"
            title="Reset Database ke Pengaturan Demo"
            aria-label="Reset Database"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className={`p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800 transition cursor-pointer shadow-2xs flex items-center justify-center active:scale-95 ${
              !isCollapsed ? 'flex-1 gap-1.5' : 'shrink-0'
            }`}
            title="Keluar / Logout Akun"
            aria-label="Keluar / Logout"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="text-xs font-bold">Keluar</span>}
          </button>
        </div>

        {/* Creator Attribution */}
        {!isCollapsed && (
          <div className="pt-2 text-center text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
            <Code2 className="w-3 h-3 text-slate-400 shrink-0" />
            <span>
              Dibuat oleh <strong className="text-slate-700 dark:text-slate-200 font-semibold">{appSettings.creatorName || 'Puput Sasmita'}</strong>
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
