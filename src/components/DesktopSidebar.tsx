import React, { useState, useEffect } from 'react';
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
  LogOut,
  RotateCcw,
  Sparkles,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User as UserIcon,
  Layers,
  Code2,
  FileText,
  CalendarClock
} from 'lucide-react';
import { AppSettings, User, UserRole } from '../types';
import { AppLogo } from './AppLogo';
import { ThemeToggle } from './ThemeToggle';
import { DatabaseService } from '../services/databaseService';

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
}

interface NavSectionItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  allowedRoles: UserRole[];
}

interface NavSection {
  title: string;
  items: NavSectionItem[];
}

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
  onToggleCollapse
}) => {
  const dbService = DatabaseService.getInstance();
  const role = currentUser.role;

  // Detail peran / tugas
  const assignedClass = role === 'wali_kelas' ? dbService.getHomeroomClass(currentUser.id) : null;
  const teacherSubjects = role === 'guru' ? dbService.getSubjectsByTeacher(currentUser.id) : [];
  const studentClass = role === 'siswa' ? dbService.getStudentClass(currentUser.id) : null;
  const parentChildren = role === 'orang_tua' ? dbService.getChildrenOfParent(currentUser.id) : [];

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

  // Navigasi Terstruktur dan Terkategori
  const navSections: NavSection[] = [
    {
      title: 'Utama & Akademik',
      items: [
        {
          id: 'dashboard',
          label: 'Dasbor Utama',
          icon: TrendingUp,
          allowedRoles: ['admin', 'wali_kelas', 'guru', 'siswa', 'orang_tua']
        },
        {
          id: 'student_portal',
          label: role === 'orang_tua' ? 'Portal Wali Murid' : 'Portal Siswa',
          icon: GraduationCap,
          allowedRoles: ['siswa', 'orang_tua']
        },
        {
          id: 'attendance',
          label: 'Presensi Siswa',
          icon: CalendarCheck2,
          allowedRoles: ['admin', 'wali_kelas', 'guru']
        },
        {
          id: 'grades',
          label: 'Nilai & Rapor',
          icon: Award,
          allowedRoles: ['admin', 'wali_kelas', 'guru']
        },
        {
          id: 'homeroom',
          label: 'Menu Wali Kelas',
          icon: School,
          allowedRoles: ['admin', 'wali_kelas']
        }
      ]
    },
    {
      title: 'Manajemen Data',
      items: [
        {
          id: 'master_academic',
          label: 'Master Akademik',
          icon: GraduationCap,
          allowedRoles: ['admin']
        },
        {
          id: 'drive_photos',
          label: 'Foto Drive',
          icon: HardDrive,
          allowedRoles: ['admin']
        },
        {
          id: 'users',
          label: 'Manajemen Pengguna',
          icon: Users,
          allowedRoles: ['admin']
        },
        {
          id: 'scheduled_exports',
          label: 'Jadwal Ekspor & Cloud',
          icon: CalendarClock,
          badge: 'Otomatis',
          badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          allowedRoles: ['admin']
        }
      ]
    },
    {
      title: 'Pengaturan & Teks',
      items: [
        {
          id: 'app_settings',
          label: 'Identitas & Logo',
          icon: Settings,
          allowedRoles: ['admin']
        },
        {
          id: 'running_text',
          label: 'Running Text',
          icon: Megaphone,
          allowedRoles: ['admin']
        },
        {
          id: 'kop_settings',
          label: 'Kertas, Kop & Tanda Tangan',
          icon: FileText,
          allowedRoles: ['admin']
        }
      ]
    },
    {
      title: 'Sistem & Keamanan',
      items: [
        {
          id: 'architecture',
          label: 'Firebase & Database',
          icon: Database,
          allowedRoles: ['admin']
        },
        {
          id: 'security_settings',
          label: 'Keamanan & Anti-Cheat',
          icon: ShieldCheck,
          allowedRoles: ['admin']
        },
        {
          id: 'activity_logs',
          label: 'Log Aktivitas',
          icon: History,
          allowedRoles: ['admin']
        }
      ]
    }
  ];

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
          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title={isCollapsed ? 'Perlebar Menu' : 'Perkecil Menu'}
          aria-label={isCollapsed ? 'Perlebar Menu' : 'Perkecil Menu'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-black dark:text-white" /> : <ChevronLeft className="w-4 h-4 text-black dark:text-white" />}
        </button>
      </div>

      {/* 2. Kartu Profil Pengguna Aktif */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            {/* Avatar Circle */}
            <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 uppercase">
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
              className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-xs uppercase cursor-pointer"
              title={`${currentUser.nama} (${getRoleDisplayName(currentUser.role)})`}
            >
              {currentUser.nama.substring(0, 2)}
            </div>
          </div>
        )}
      </div>

      {/* 3. Daftar Menu Navigasi (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {navSections.map((section, idx) => {
          // Filter item sesuai role pengguna saat ini
          const visibleItems = section.items.filter((item) =>
            item.allowedRoles.includes(currentUser.role)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title || idx} className="space-y-1">
              {/* Section Header Title */}
              {!isCollapsed ? (
                <h3 className="px-2 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {section.title}
                </h3>
              ) : (
                <div className="h-px bg-slate-200 dark:bg-slate-800 my-2 mx-1" />
              )}

              {/* Navigation Items */}
              <div className="space-y-1.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      id={`tab-${item.id.replace(/_/g, '-')}`}
                      onClick={() => onSelectTab(item.id)}
                      className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer text-left border ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 ring-1 ring-blue-500'
                          : 'border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:border-blue-200 dark:hover:border-blue-800/60 shadow-2xs'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                      title={isCollapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
                    >
                      {/* Icon */}
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive
                            ? 'text-white'
                            : 'text-black dark:text-white'
                        }`}
                      />

                      {/* Label & Badge */}
                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between gap-1.5 min-w-0">
                          <span className="truncate">{item.label}</span>
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
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Footer Sidebar: Quick Actions & Logout */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 space-y-2">
        {/* Action Buttons Row */}
        <div className={`flex items-center gap-1.5 ${isCollapsed ? 'flex-col' : 'justify-between'}`}>
          {/* Panduan Interaktif Tour */}
          <button
            type="button"
            onClick={onOpenTour}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs shrink-0 flex items-center justify-center"
            title="Panduan Interaktif Pengguna"
            aria-label="Panduan Interaktif"
          >
            <HelpCircle className="w-4 h-4 text-black dark:text-white" />
          </button>

          {/* Theme Toggle Button */}
          <div className="shrink-0 flex items-center justify-center">
            <ThemeToggle />
          </div>

          {/* Reset Database Button (Untuk Demo & Pengujian) */}
          <button
            type="button"
            onClick={onResetData}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs shrink-0 flex items-center justify-center"
            title="Reset Database ke Pengaturan Demo"
            aria-label="Reset Database"
          >
            <RotateCcw className="w-4 h-4 text-black dark:text-white" />
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className={`p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800 transition cursor-pointer shadow-2xs flex items-center justify-center ${
              !isCollapsed ? 'flex-1 gap-1.5' : 'shrink-0'
            }`}
            title="Keluar / Logout Akun"
            aria-label="Keluar / Logout"
          >
            <LogOut className="w-4 h-4 shrink-0 text-black dark:text-white" />
            {!isCollapsed && <span className="text-xs font-bold">Keluar</span>}
          </button>
        </div>

        {/* Creator Attribution */}
        {!isCollapsed && (
          <div className="pt-2 text-center text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
            <Code2 className="w-3 h-3 text-black dark:text-white shrink-0" />
            <span>
              Dibuat oleh <strong className="text-slate-700 dark:text-slate-200 font-semibold">{appSettings.creatorName || 'Puput Sasmita'}</strong>
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
