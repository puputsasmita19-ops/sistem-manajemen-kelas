import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseService } from '../services/databaseService';
import { User, UserRole, AppSettings } from '../types';
import { useRealtimeClock } from '../utils/timeUtils';
import { AppLogo } from './AppLogo';
import { ThemeToggle } from './ThemeToggle';
import Swal from 'sweetalert2';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Code2,
  Calendar,
  Clock,
  Sun,
  SunMedium,
  Sunset,
  Moon,
  ShieldCheck,
  Shield,
  GraduationCap,
  BookOpen,
  School,
  Users,
  RotateCcw,
  Sparkles,
  ChevronDown,
  UserCheck,
  Check,
  MoveHorizontal,
  Layers
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  appSettings?: AppSettings;
}

interface RoleCredentialConfig {
  role: UserRole;
  label: string;
  roleTitle: string;
  username: string;
  password: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeLabel: string;
}

const DEFAULT_ROLE_ACCOUNTS: RoleCredentialConfig[] = [
  {
    role: 'admin',
    label: 'Admin',
    roleTitle: 'Administrator Sekolah',
    username: 'admin',
    password: 'admin123',
    name: 'Bambang Wijaya, M.Kom',
    icon: ShieldCheck,
    accentColor: 'amber',
    badgeLabel: 'Wajib Tab Admin'
  },
  {
    role: 'wali_kelas',
    label: 'Wali Kelas',
    roleTitle: 'Wali Kelas',
    username: 'walikelas',
    password: 'wali123',
    name: 'Budi Santoso, S.Pd',
    icon: GraduationCap,
    accentColor: 'indigo',
    badgeLabel: '18 Administrasi'
  },
  {
    role: 'guru',
    label: 'Guru Mapel',
    roleTitle: 'Guru Mapel',
    username: 'guru',
    password: 'guru123',
    name: 'Siti Rahmawati, M.Pd',
    icon: BookOpen,
    accentColor: 'blue',
    badgeLabel: 'KBM & Nilai'
  },
  {
    role: 'siswa',
    label: 'Siswa',
    roleTitle: 'Siswa',
    username: 'siswa',
    password: 'siswa123',
    name: 'Ahmad Rizky Pratama',
    icon: School,
    accentColor: 'emerald',
    badgeLabel: 'Portal Siswa'
  },
  {
    role: 'orang_tua',
    label: 'Orang Tua',
    roleTitle: 'Orang Tua',
    username: 'ortu',
    password: 'ortu123',
    name: 'Hendra Pratama (Ayah Ahmad)',
    icon: Users,
    accentColor: 'purple',
    badgeLabel: 'Monitoring Anak'
  }
];

const SELECTABLE_ROLES: RoleCredentialConfig[] = DEFAULT_ROLE_ACCOUNTS.filter(
  (cfg) => cfg.role !== 'admin'
);

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, appSettings: initialAppSettings }) => {
  const dbService = DatabaseService.getInstance();
  const clock = useRealtimeClock();

  const [appSettings, setAppSettings] = useState<AppSettings>(() => initialAppSettings || dbService.getAppSettings());
  const [selectedRole, setSelectedRole] = useState<UserRole>('wali_kelas');
  const [username, setUsername] = useState('walikelas');
  const [password, setPassword] = useState('wali123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [isDragging, setIsDragging] = useState(false);

  const availableCategories = ['Semua', 'Sapaan', 'Akademik', 'Presensi', 'Sekolah', 'Pengumuman'];

  const handleCycleCategory = () => {
    const currentIdx = availableCategories.indexOf(selectedCategory);
    const nextIdx = (currentIdx + 1) % availableCategories.length;
    setSelectedCategory(availableCategories[nextIdx]);
  };

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sinkronisasi realtime jika prop appSettings diperbarui dari parent
  useEffect(() => {
    if (initialAppSettings) {
      setAppSettings(initialAppSettings);
    }
  }, [initialAppSettings]);

  // Sinkronisasi real-time via dbService listener, storage event, dan window focus
  useEffect(() => {
    // Pastikan data selalu paling mutakhir saat halaman login aktif
    setAppSettings(dbService.getAppSettings());

    const unsub = dbService.subscribeAppSettings((updated) => {
      setAppSettings(updated);
    });

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'SIMAK_FIREBASE_RTDB_SIMULATION' && e.newValue) {
        setAppSettings(dbService.getAppSettings());
      }
    };

    const handleWindowFocus = () => {
      setAppSettings(dbService.getAppSettings());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      unsub();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Susun daftar item running text yang aktif sesuai konfigurasi Admin
  const configuredItems = (appSettings.runningTextItems || []).filter(
    item => item.isActive && item.text && item.text.trim().length > 0
  );
  const allDisplayItems: Array<{ id: string; badge: string; text: string }> = [];

  if (appSettings.runningTextIncludeGreeting !== false) {
    allDisplayItems.push({
      id: 'greeting-auto',
      badge: 'Sapaan',
      text: clock.greetingDescription
    });
  }

  // Tambahkan item informatif esensial jika belum ada di konfigurasi khusus
  const hasAkademik = configuredItems.some(i => (i.badge || '').toLowerCase().includes('akademik') || (i.badge || '').toLowerCase().includes('jadwal'));
  if (!hasAkademik) {
    allDisplayItems.push({
      id: 'default-akademik',
      badge: 'Akademik',
      text: 'Jadwal Pembelajaran KBM Semester Genap berlangsung normal sesuai agenda akademik.'
    });
  }

  const hasPresensi = configuredItems.some(i => (i.badge || '').toLowerCase().includes('presensi') || (i.badge || '').toLowerCase().includes('hadir'));
  if (!hasPresensi) {
    allDisplayItems.push({
      id: 'default-presensi',
      badge: 'Presensi',
      text: 'Presensi kehadiran harian siswa & guru dibuka pukul 06:30 - 07:15 WIB.'
    });
  }

  if (configuredItems.length > 0) {
    configuredItems.forEach(item => {
      allDisplayItems.push({
        id: item.id,
        badge: item.badge || 'Pengumuman',
        text: item.text.replace(/\{appName\}|\{app_name\}|\{namaSekolah\}/gi, appSettings.appName || 'SIMAK')
      });
    });
  }

  allDisplayItems.push({
    id: 'default-sekolah',
    badge: 'Sekolah',
    text: `Selamat Datang di Portal Resmi ${appSettings.appName || 'SIMAK'}`
  });

  // Filter berdasarkan kategori yang dipilih
  const displayRunningItems = selectedCategory === 'Semua'
    ? allDisplayItems
    : allDisplayItems.filter(item => item.badge.toLowerCase().includes(selectedCategory.toLowerCase()));

  const activeRunningItems = displayRunningItems.length > 0 ? displayRunningItems : allDisplayItems;

  const marqueeDuration = Number(appSettings.runningTextSpeed) || 28;

  const getBadgeClass = (badge: string) => {
    const b = badge.toLowerCase();
    if (b.includes('sapaan')) return 'text-blue-700 bg-white/95 border-blue-200/70';
    if (b.includes('sekolah') || b.includes('portal')) return 'text-indigo-700 bg-white/95 border-indigo-200/70';
    if (b.includes('akademik') || b.includes('jadwal')) return 'text-sky-700 bg-white/95 border-sky-200/70';
    if (b.includes('presensi') || b.includes('hadir')) return 'text-emerald-700 bg-white/95 border-emerald-200/70';
    if (b.includes('penting') || b.includes('peringatan')) return 'text-rose-700 bg-white/95 border-rose-200/70';
    if (b.includes('prestasi') || b.includes('motto')) return 'text-amber-700 bg-white/95 border-amber-200/70';
    return 'text-slate-700 bg-white/95 border-slate-200/70';
  };

  useEffect(() => {
    const unsub = dbService.subscribeAppSettings((updated) => {
      setAppSettings(updated);
    });
    return () => unsub();
  }, []);

  const getRoleLabel = (r: UserRole): string => {
    switch (r) {
      case 'admin':
        return 'Admin';
      case 'wali_kelas':
        return 'Wali Kelas';
      case 'guru':
        return 'Guru Mapel';
      case 'siswa':
        return 'Siswa';
      case 'orang_tua':
        return 'Orang Tua';
      default:
        return r;
    }
  };

  const currentRoleConfig =
    DEFAULT_ROLE_ACCOUNTS.find((r) => r.role === selectedRole) || DEFAULT_ROLE_ACCOUNTS[0];

  const handleRoleChange = (newRole: UserRole) => {
    setSelectedRole(newRole);
    setIsDropdownOpen(false);
    const targetConfig = DEFAULT_ROLE_ACCOUNTS.find((r) => r.role === newRole);
    if (targetConfig) {
      setUsername(targetConfig.username);
      setPassword(targetConfig.password);
    }
  };

  const handleResetToDefault = () => {
    setUsername(currentRoleConfig.username);
    setPassword(currentRoleConfig.password);
  };

  const processLogin = (targetUser: string, targetPass: string) => {
    const trimmedInput = targetUser.trim();
    if (!trimmedInput) {
      Swal.fire({
        icon: 'warning',
        title: 'Username Kosong',
        text: 'Silakan masukkan username akun Anda.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    if (!targetPass) {
      Swal.fire({
        icon: 'warning',
        title: 'Password Kosong',
        text: 'Silakan masukkan kata sandi akun Anda.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Find user by username
      const allUsers = dbService.getAllUsers();
      let user = dbService.findUserByUsername(trimmedInput);

      // Fallback search in default credentials if custom user not found
      if (!user) {
        const defaultMatch = DEFAULT_ROLE_ACCOUNTS.find(
          (d) => d.username.toLowerCase() === trimmedInput.toLowerCase()
        );
        if (defaultMatch) {
          user = allUsers.find((u) => u.role === defaultMatch.role);
        }
      }

      if (!user) {
        setIsLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Username Tidak Ditemukan',
          text: `Akun dengan username "${trimmedInput}" belum terdaftar pada sistem ${appSettings.appName}. Silakan gunakan username default untuk peran ${getRoleLabel(selectedRole)} ("${currentRoleConfig.username}").`,
          confirmButtonColor: '#2563eb'
        });
        return;
      }

      // Password verification
      const validPasswords = [
        user.password_hash,
        'admin123',
        'guru123',
        'wali123',
        'siswa123',
        'ortu123'
      ];

      if (!validPasswords.includes(targetPass)) {
        setIsLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Kata Sandi Salah',
          text: `Kata sandi yang Anda masukkan salah. Password default untuk peran ${getRoleLabel(user.role)} adalah "${currentRoleConfig.password}".`,
          confirmButtonColor: '#1e293b'
        });
        return;
      }

      if (user.role !== selectedRole) {
        setSelectedRole(user.role);
      }

      // Record Activity Log
      dbService.logActivity(
        'login',
        'Autentikasi Pengguna Berhasil',
        `Pengguna ${user.nama} (@${user.username}) berhasil login sebagai ${getRoleLabel(user.role)}.`,
        `user_${user.id}`,
        undefined,
        { id: user.id, nama: user.nama, role: user.role }
      );

      setIsLoading(false);
      Swal.fire({
        icon: 'success',
        title: `Selamat Datang, ${user.nama}!`,
        text: `Berhasil masuk sebagai ${getRoleLabel(user.role)} ke sistem ${appSettings.appName}`,
        timer: 1400,
        showConfirmButton: false
      });

      onLoginSuccess(user);
    }, 280);
  };

  const handleForgotPassword = () => {
    const adminUser = dbService.getAllUsers().find((u) => u.role === 'admin');
    const adminName = adminUser?.nama || 'Bambang Wijaya, M.Kom';
    const adminPhone = appSettings.adminPhone || adminUser?.no_wa || '0812-3456-7890';
    const cleanWa = adminPhone.replace(/\D/g, '').replace(/^0/, '62');
    const waText = encodeURIComponent(
      `Halo Administrator ${appSettings.appName}, saya membutuhkan bantuan untuk reset kata sandi akun saya.`
    );
    const waUrl = `https://wa.me/${cleanWa}?text=${waText}`;

    Swal.fire({
      icon: 'info',
      title: 'Bantuan Akses & Lupa Kata Sandi',
      html: `
        <div class="text-left text-xs text-slate-700 space-y-3">
          <p class="leading-relaxed">
            Jika Anda lupa username atau kata sandi akun <strong>${appSettings.appName}</strong>, silakan hubungi kontak Administrator Sistem atau staf Tata Usaha Sekolah berikut:
          </p>

          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div class="flex items-center justify-between py-1 border-b border-slate-200">
              <span class="text-slate-500 font-medium">Administrator:</span>
              <strong class="text-slate-900">${adminName}</strong>
            </div>
            <div class="flex items-center justify-between py-1 border-b border-slate-200">
              <span class="text-slate-500 font-medium">Unit / Ruang:</span>
              <span class="text-slate-800 font-semibold">Tata Usaha & IT Sekolah</span>
            </div>
            <div class="flex items-center justify-between py-1 border-b border-slate-200">
              <span class="text-slate-500 font-medium">Jam Layanan:</span>
              <span class="text-slate-800 font-medium">Senin – Jumat (07.30 – 15.00 WIB)</span>
            </div>
            <div class="flex items-center justify-between py-1">
              <span class="text-slate-500 font-medium">Nomor WhatsApp:</span>
              <strong class="text-emerald-600 font-mono text-sm">${adminPhone}</strong>
            </div>
          </div>

          <a
            href="${waUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 text-center no-underline cursor-pointer"
          >
            <span>💬 Hubungi Admin via WhatsApp (${adminPhone})</span>
          </a>

          <div class="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-800 flex items-start gap-2">
            <span class="font-bold">Tips Default:</span>
            <span>Anda dapat memilih peran di atas dan mengklik tombol "Default" untuk memulihkan kredensial bawaan.</span>
          </div>
        </div>
      `,
      confirmButtonText: 'Tutup',
      confirmButtonColor: '#2563eb'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processLogin(username, password);
  };

  const renderGreetingIcon = (period: 'pagi' | 'siang' | 'sore' | 'malam') => {
    switch (period) {
      case 'pagi':
        return <Sun className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'siang':
        return <SunMedium className="w-5 h-5 text-yellow-500 shrink-0" />;
      case 'sore':
        return <Sunset className="w-5 h-5 text-orange-500 shrink-0" />;
      case 'malam':
      default:
        return <Moon className="w-5 h-5 text-indigo-500 shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col justify-center items-center py-6 px-4 select-none font-sans bg-gradient-to-b from-[#8ecbf8] via-[#c6e6fc] to-[#f2f9ff] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
      {/* 0) TOMBOL TOGGLE TEMA GELAP / TERANG DI POJOK KANAN ATAS */}
      <div className="absolute top-4 right-4 z-30">
        <ThemeToggle />
      </div>

      {/* Radial Atmospheric Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0)_60%)] dark:bg-[radial-gradient(circle_at_50%_38%,rgba(30,58,138,0.25)_0%,rgba(0,0,0,0)_60%)] pointer-events-none" />

      {/* Concentric Orbital Radar / Arc Rings */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
        <div className="w-[480px] h-[480px] rounded-full border border-white/50 dark:border-slate-700/30 animate-[spin_120s_linear_infinite]" />
        <div className="absolute inset-0 -m-[140px] rounded-full border border-white/40 dark:border-slate-700/25" />
        <div className="absolute inset-0 -m-[280px] rounded-full border border-white/30 dark:border-slate-700/20" />
        <div className="absolute inset-0 -m-[420px] rounded-full border border-white/20 dark:border-slate-700/15" />
      </div>

      {/* Realistic Layered Clouds Backdrop */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none z-0 h-[65vh] overflow-hidden opacity-95 dark:opacity-20 transition-opacity">
        <svg
          viewBox="0 0 1440 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute bottom-0 w-full h-full object-cover preserve-3d"
        >
          <defs>
            <linearGradient id="cloudGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#e2f1fc" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="cloudGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#f5faff" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#dbeeff" stopOpacity="1" />
            </linearGradient>
            <filter id="cloudSoftBlur" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
            <filter id="cloudDistantBlur" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="28" />
            </filter>
          </defs>

          <g filter="url(#cloudDistantBlur)" opacity="0.6">
            <ellipse cx="220" cy="420" rx="340" ry="140" fill="url(#cloudGrad1)" />
            <ellipse cx="720" cy="450" rx="420" ry="160" fill="url(#cloudGrad1)" />
            <ellipse cx="1260" cy="410" rx="360" ry="150" fill="url(#cloudGrad1)" />
          </g>

          <g filter="url(#cloudSoftBlur)" opacity="0.85">
            <path
              d="M-50 600 C 60 480, 200 420, 360 450 C 490 350, 680 370, 780 440 C 900 340, 1100 350, 1220 420 C 1320 370, 1450 430, 1500 520 L 1500 600 Z"
              fill="url(#cloudGrad1)"
            />
          </g>

          <path
            d="M-40 600 C 40 500, 160 460, 280 490 C 360 410, 520 400, 620 470 C 700 420, 840 430, 920 480 C 1040 390, 1220 400, 1340 470 C 1410 430, 1480 480, 1520 560 L 1520 600 Z"
            fill="url(#cloudGrad2)"
          />

          <ellipse cx="120" cy="380" rx="180" ry="75" fill="#ffffff" opacity="0.8" />
          <ellipse cx="1320" cy="360" rx="200" ry="80" fill="#ffffff" opacity="0.85" />
          <ellipse cx="40" cy="450" rx="240" ry="90" fill="#ffffff" opacity="0.9" />
          <ellipse cx="1400" cy="440" rx="260" ry="95" fill="#ffffff" opacity="0.9" />
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* MAIN LOGIN CARD CONTAINER (Proportional, Balanced & Responsive)           */}
      {/* ========================================================================= */}
      <main className="relative z-10 w-full max-w-[460px] px-2 sm:px-0">
        <div className="absolute -inset-1.5 bg-gradient-to-b from-white/50 via-blue-200/25 to-indigo-300/35 dark:from-blue-600/10 dark:via-indigo-500/10 dark:to-transparent rounded-[36px] blur-xl pointer-events-none -z-10" />

        <div className="relative w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[28px] sm:rounded-[32px] p-4 sm:p-7 shadow-[0_20px_50px_-10px_rgba(20,70,120,0.18),0_0_0_1px_rgba(255,255,255,0.95)_inset] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)_inset] border border-white/90 dark:border-slate-800 transition-all">
          
          {/* 1) LOGO & JUDUL BESAR APLIKASI */}
          <div className="flex flex-col items-center justify-center mb-2">
            <AppLogo settings={appSettings} size="lg" className="shadow-md shadow-blue-500/15 transition-transform hover:scale-105" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase mt-1.5 sm:mt-2">
              {appSettings.appName || 'SIMAK'}
            </h1>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">
              Sistem Manajemen Kelas & Administrasi
            </p>
          </div>

          {/* 2) TANGGAL & JAM REALTIME (Sama dengan versi desktop dengan ukuran proporsional) */}
          <div className="flex items-center justify-center mb-2.5 px-0.5 sm:px-1 w-full">
            <div
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] min-[360px]:text-[10.5px] min-[390px]:text-[11.5px] sm:text-xs shadow-2xs whitespace-nowrap tracking-tight sm:tracking-normal shrink-0 max-w-full"
              title={`Waktu & Tanggal Realtime: ${clock.dateFormatted} • ${clock.timeFormatted}`}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 font-medium text-slate-700 dark:text-slate-300 shrink-0">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{clock.dateFormatted}</span>
              </div>
              <span className="text-slate-300 dark:text-slate-600 shrink-0 select-none">•</span>
              <div className="flex items-center gap-1 sm:gap-1.5 font-mono font-bold text-slate-900 dark:text-slate-100 shrink-0">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{clock.timeFormatted}</span>
              </div>
            </div>
          </div>

          {/* 3) SAPAAN SESUAI WAKTU & MODE RUNNING TEXT */}
          <div className="text-center mb-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-1.5">
              <span>{clock.greeting}</span>
              {renderGreetingIcon(clock.period)}
            </h2>

            {/* CONTAINER RUNNING TEXT INTERAKTIF DENGAN FITUR TARIK ULUR & SWITCH KATEGORI */}
            <div className="mt-2">
              <div className="relative overflow-hidden w-full rounded-2xl bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-sky-50/90 dark:from-slate-800/95 dark:via-blue-950/20 dark:to-slate-800/95 border border-sky-200/80 dark:border-slate-700 p-1.5 flex items-center gap-2 shadow-2xs group transition-all">
                {/* 1. BADGE KATEGORI INTERAKTIF (Sentuh untuk beralih topik: Sapaan, Akademik, Presensi, Sekolah, dst.) */}
                <motion.button
                  type="button"
                  onClick={handleCycleCategory}
                  whileTap={{ scale: 0.94 }}
                  title={`Kategori Aktif: ${selectedCategory}. Klik / sentuh untuk beralih ke informasi berikutnya`}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-2xs transition-all cursor-pointer group/badge select-none"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-extrabold tracking-wide uppercase">
                      {selectedCategory === 'Semua' ? 'Info' : selectedCategory}
                    </span>
                    <ChevronDown className="w-3 h-3 text-white/80 group-hover/badge:translate-y-0.5 transition-transform" />
                  </div>
                </motion.button>

                {/* 2. TRACK RUNNING TEXT DRAGGABLE / TARIK ULUR */}
                <div
                  className="relative overflow-hidden flex-1 select-none [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)] cursor-grab active:cursor-grabbing"
                  title="Sentuh & tarik ke kiri/kanan untuk menjelajahi teks informasi"
                >
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: -850, right: 100 }}
                    dragElastic={0.2}
                    dragMomentum={true}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={() => setIsDragging(false)}
                    className={`flex items-center gap-6 py-0.5 whitespace-nowrap text-xs text-slate-700 dark:text-slate-200 font-medium ${
                      !isDragging ? 'animate-running-text-smooth' : ''
                    }`}
                    style={{ animationDuration: `${marqueeDuration}s` }}
                  >
                    {/* Konten Diulang 2x untuk Loop Berkelanjutan */}
                    {[1, 2].map((loopIdx) => (
                      <React.Fragment key={`marquee-loop-${loopIdx}`}>
                        {activeRunningItems.map((item, itemIdx) => (
                          <React.Fragment key={`item-${loopIdx}-${item.id || itemIdx}`}>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCategory(item.badge);
                              }}
                              className="inline-flex items-center gap-1.5 shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
                              title={`Sentuh untuk fokus ke kategori ${item.badge}`}
                            >
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-md shadow-2xs border ${getBadgeClass(
                                  item.badge
                                )}`}
                              >
                                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                <span>{item.badge}</span>
                              </span>
                              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                {item.text}
                              </span>
                            </div>
                            <span className="text-sky-300 dark:text-slate-600 font-black select-none">•</span>
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))}
                  </motion.div>
                </div>

                {/* 3. INDIKATOR TARIK ULUR MINIMALIS */}
                <div
                  className="shrink-0 flex items-center justify-center pl-1 text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-100 transition-opacity"
                  title="Teks dapat ditarik ulur ke kiri/kanan"
                >
                  <MoveHorizontal className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* FORM LOGIN MODERN, LEGA & MINIMALIS                                   */}
          {/* ===================================================================== */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. DROPDOWN PERAN / ROLE AKSES DENGAN ANIMASI SMOOTH */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Peran / Hak Akses
                </label>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  title="Pulihkan username & kata sandi default untuk peran ini"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer hover:underline"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Kredensial Default</span>
                </button>
              </div>

              {/* Trigger Dropdown Button */}
              <button
                type="button"
                id="btn-role-dropdown"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className={`w-full relative bg-slate-50/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2.5 transition-all duration-200 border cursor-pointer shadow-2xs ${
                  isDropdownOpen
                    ? 'border-blue-600 ring-2 ring-blue-600/20 bg-white dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {React.createElement(currentRoleConfig.icon, {
                    className: 'w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0'
                  })}
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {selectedRole === 'admin' ? 'Administrator Sekolah' : currentRoleConfig.label}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="shrink-0 flex items-center justify-center text-slate-400"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </button>

              {/* Menu Dropdown Smooth Animated */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-full left-0 right-0 mt-1.5 p-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xl z-50 overflow-hidden"
                  >
                    <div className="space-y-1">
                      {SELECTABLE_ROLES.map((cfg) => {
                        const isSelected = selectedRole === cfg.role;
                        const RoleIcon = cfg.icon;
                        return (
                          <motion.button
                            key={cfg.role}
                            type="button"
                            onClick={() => handleRoleChange(cfg.role)}
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold'
                                : 'hover:bg-slate-100/90 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                <RoleIcon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-sm">{cfg.label}</span>
                            </div>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.15 }}
                              >
                                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2. USERNAME INPUT */}
            <div className="relative">
              <label htmlFor="input-username" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 px-0.5 uppercase tracking-wider">
                Username
              </label>
              <div className="bg-slate-50/90 dark:bg-slate-800/90 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 transition-all border border-slate-200 dark:border-slate-700 shadow-2xs">
                <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  id="input-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={`Contoh: ${currentRoleConfig.username}`}
                  className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none font-medium"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* 3. PASSWORD INPUT */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <label htmlFor="input-password" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  id="btn-forgot-password"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold transition cursor-pointer"
                >
                  Lupa kata sandi?
                </button>
              </div>

              <div className="bg-slate-50/90 dark:bg-slate-800/90 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 transition-all border border-slate-200 dark:border-slate-700 shadow-2xs">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password akun"
                  className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none font-mono"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition p-0.5 cursor-pointer shrink-0"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 4. TOMBOL MASUK */}
            <div className="pt-2">
              <button
                id="btn-masuk"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memproses Masuk...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span>Masuk sebagai {selectedRole === 'admin' ? 'Administrator' : getRoleLabel(selectedRole)}</span>
                  </>
                )}
              </button>
            </div>

            {/* 5. TULISAN MASUK SEBAGAI ADMINISTRATOR SEKOLAH */}
            <div className="pt-1 text-center">
              {selectedRole === 'admin' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-900 dark:text-amber-200 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Mode Administrator Aktif</span>
                  <button
                    type="button"
                    onClick={() => handleRoleChange('wali_kelas')}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold"
                  >
                    (Beralih ke Peran Lain)
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-login-admin"
                  onClick={() => handleRoleChange('admin')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1 px-3 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Masuk sebagai Administrator Sekolah</span>
                </button>
              )}
            </div>
          </form>

          {/* DIBUAT OLEH PUPUT SASMITA */}
          <div className="mt-5 pt-3.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Code2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              Dibuat oleh: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{appSettings.creatorName || 'Puput Sasmita'}</strong>
            </span>
          </div>

        </div>
      </main>
    </div>
  );
};

