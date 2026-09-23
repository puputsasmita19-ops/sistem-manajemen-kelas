import React from 'react';
import {
  TrendingUp,
  CalendarCheck2,
  Award,
  School,
  GraduationCap,
  LayoutGrid,
  Users,
  BookOpen
} from 'lucide-react';
import { User } from '../types';

interface AndroidBottomNavProps {
  currentUser: User;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenDrawer: () => void;
  isDrawerOpen: boolean;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onOpenDrawer,
  isDrawerOpen
}) => {
  const role = currentUser.role;

  // Primary bottom tabs based on role
  const getNavItems = () => {
    if (role === 'siswa' || role === 'orang_tua') {
      return [
        {
          id: 'student_portal',
          label: role === 'orang_tua' ? 'Portal Murid' : 'Portal Siswa',
          icon: GraduationCap
        },
        {
          id: 'dashboard',
          label: 'Dasbor',
          icon: TrendingUp
        }
      ];
    }

    if (role === 'admin' || role === 'wali_kelas') {
      return [
        {
          id: 'dashboard',
          label: 'Dasbor',
          icon: TrendingUp
        },
        {
          id: 'attendance',
          label: 'Presensi',
          icon: CalendarCheck2
        },
        {
          id: 'grades',
          label: 'Nilai',
          icon: Award
        },
        {
          id: 'homeroom',
          label: 'Wali Kelas',
          icon: School,
          badge: '18'
        }
      ];
    }

    // Role Guru
    return [
      {
        id: 'dashboard',
        label: 'Dasbor',
        icon: TrendingUp
      },
      {
        id: 'teacher_journal',
        label: 'Jurnal KBM',
        icon: BookOpen
      },
      {
        id: 'attendance',
        label: 'Presensi',
        icon: CalendarCheck2
      },
      {
        id: 'grades',
        label: 'Nilai & Rapor',
        icon: Award
      }
    ];
  };

  const navItems = getNavItems();

  return (
    <nav
      id="android-bottom-navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-xl px-2 py-1.5 flex items-center justify-around safe-area-pb"
      aria-label="Navigasi Bawah Android"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id && !isDrawerOpen;

        return (
          <button
            key={item.id}
            id={`android-nav-${item.id}`}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-2xl transition cursor-pointer relative min-h-[50px] ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            {/* Material You Active Pill Indicator */}
            <div
              className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 shadow-2xs scale-105'
                  : 'bg-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.badge && (
                <span className="absolute top-1 right-2 w-4 h-4 bg-indigo-600 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[68px]">
              {item.label}
            </span>
          </button>
        );
      })}

      {/* "Semua Fitur" Drawer Button (Android App Drawer Launcher) */}
      <button
        id="android-nav-drawer-btn"
        onClick={onOpenDrawer}
        className={`flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-2xl transition cursor-pointer relative min-h-[50px] ${
          isDrawerOpen
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
        }`}
        aria-label="Buka Semua Fitur"
      >
        <div
          className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${
            isDrawerOpen
              ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 shadow-2xs scale-105'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-semibold">
          Semua Fitur
        </span>
      </button>
    </nav>
  );
};
