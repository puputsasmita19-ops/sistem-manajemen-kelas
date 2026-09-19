import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { User, UserRole, AppSettings } from '../types';
import { useRealtimeClock } from '../utils/timeUtils';
import { AppLogo } from './AppLogo';
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
  GraduationCap,
  BookOpen,
  School,
  Users,
  RotateCcw,
  Sparkles,
  Play,
  Pause
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
    roleTitle: 'Wali Kelas (X-IPA-1)',
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
    roleTitle: 'Guru Mata Pelajaran',
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
    roleTitle: 'Peserta Didik (X-IPA-1)',
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
    roleTitle: 'Wali Murid Siswa',
    username: 'ortu',
    password: 'ortu123',
    name: 'Hendra Pratama (Ayah Ahmad)',
    icon: Users,
    accentColor: 'purple',
    badgeLabel: 'Monitoring Anak'
  }
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, appSettings: initialAppSettings }) => {
  const dbService = DatabaseService.getInstance();
  const clock = useRealtimeClock();

  const [appSettings, setAppSettings] = useState<AppSettings>(() => initialAppSettings || dbService.getAppSettings());
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [runningTextMode, setRunningTextMode] = useState<'running' | 'static'>(() => {
    try {
      return (localStorage.getItem('login_running_text_mode') as 'running' | 'static') || 'running';
    } catch {
      return 'running';
    }
  });
  const [isMarqueePlaying, setIsMarqueePlaying] = useState<boolean>(true);

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

  const handleToggleRunningTextMode = () => {
    const nextMode = runningTextMode === 'running' ? 'static' : 'running';
    setRunningTextMode(nextMode);
    try {
      localStorage.setItem('login_running_text_mode', nextMode);
    } catch {
      // ignore
    }
  };

  // Susun daftar item running text yang aktif sesuai konfigurasi Admin
  const configuredItems = (appSettings.runningTextItems || []).filter(
    item => item.isActive && item.text && item.text.trim().length > 0
  );
  const displayRunningItems: Array<{ id: string; badge: string; text: string }> = [];

  if (appSettings.runningTextIncludeGreeting !== false) {
    displayRunningItems.push({
      id: 'greeting-auto',
      badge: 'Sapaan',
      text: clock.greetingDescription
    });
  }

  if (configuredItems.length > 0) {
    configuredItems.forEach(item => {
      displayRunningItems.push({
        id: item.id,
        badge: item.badge || 'Pengumuman',
        text: item.text.replace(/\{appName\}|\{app_name\}|\{namaSekolah\}/gi, appSettings.appName || 'SIMAK')
      });
    });
  } else if (displayRunningItems.length === 0) {
    // Hanya jika tidak ada sapaan DAN tidak ada item aktif sama sekali dari admin
    displayRunningItems.push({
      id: 'default-welcome',
      badge: 'Sekolah',
      text: `Selamat Datang di Portal Resmi ${appSettings.appName || 'SIMAK'}`
    });
  }

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

  const handleSelectRole = (config: RoleCredentialConfig) => {
    setSelectedRole(config.role);
    setUsername(config.username);
    setPassword(config.password);
  };

  const currentRoleConfig =
    DEFAULT_ROLE_ACCOUNTS.find((r) => r.role === selectedRole) || DEFAULT_ROLE_ACCOUNTS[0];

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

      // =========================================================================
      // STRICT ROLE ENFORCEMENT:
      // Pastikan username & password sesuai role pengguna, bila admin wajib di bagian admin
      // =========================================================================

      // Skenario 1: Pengguna adalah ADMIN tapi login di bagian non-admin
      if (user.role === 'admin' && selectedRole !== 'admin') {
        setIsLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Akses Admin Wajib di Tab Admin',
          html: `
            <div class="text-left text-xs space-y-2 text-slate-700">
              <p>Akun <strong>"${user.username}"</strong> memiliki hak akses sebagai <strong>Administrator Sekolah</strong>.</p>
              <div class="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 font-medium">
                ⚠️ <strong>Peraturan Keamanan SIMAK:</strong> Pengguna dengan peran Administrator <u>wajib</u> masuk melalui bagian/tab <strong>Admin</strong>.
              </div>
              <p class="text-slate-500">Anda saat ini sedang berada di bagian <strong>${getRoleLabel(selectedRole)}</strong>.</p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Beralih ke Tab Admin',
          cancelButtonText: 'Batal',
          confirmButtonColor: '#2563eb',
          cancelButtonColor: '#64748b'
        }).then((result) => {
          if (result.isConfirmed) {
            const adminConfig = DEFAULT_ROLE_ACCOUNTS.find((r) => r.role === 'admin');
            if (adminConfig) handleSelectRole(adminConfig);
          }
        });
        return;
      }

      // Skenario 2: Berada di tab ADMIN tapi pengguna bukan admin
      if (selectedRole === 'admin' && user.role !== 'admin') {
        setIsLoading(false);
        const userRoleName = getRoleLabel(user.role);
        Swal.fire({
          icon: 'warning',
          title: 'Bukan Akun Administrator',
          html: `
            <div class="text-left text-xs space-y-2 text-slate-700">
              <p>Bagian ini khusus untuk peran <strong>Administrator</strong>.</p>
              <div class="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800">
                Akun <strong>"${user.username}"</strong> terdaftar dengan peran <strong>${userRoleName}</strong>.
              </div>
              <p class="text-slate-600">Silakan pindah ke tab/bagian <strong>${userRoleName}</strong> untuk melanjutkan masuk.</p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: `Pindah ke Tab ${userRoleName}`,
          cancelButtonText: 'Tutup',
          confirmButtonColor: '#2563eb',
          cancelButtonColor: '#64748b'
        }).then((result) => {
          if (result.isConfirmed) {
            const targetConfig = DEFAULT_ROLE_ACCOUNTS.find((r) => r.role === user.role);
            if (targetConfig) handleSelectRole(targetConfig);
          }
        });
        return;
      }

      // Skenario 3: Peran akun tidak sesuai dengan role tab yang sedang dipilih
      if (user.role !== selectedRole) {
        setIsLoading(false);
        const userRoleName = getRoleLabel(user.role);
        const currentSelectedName = getRoleLabel(selectedRole);
        Swal.fire({
          icon: 'warning',
          title: 'Role Akses Tidak Sesuai',
          html: `
            <div class="text-left text-xs space-y-2 text-slate-700">
              <p>Anda saat ini sedang berada di bagian <strong>${currentSelectedName}</strong>.</p>
              <div class="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900">
                Akun <strong>"${user.username}"</strong> terdaftar dengan peran <strong>${userRoleName}</strong>.
              </div>
              <p class="text-slate-600">Silakan pilih tab <strong>${userRoleName}</strong> agar sesuai dengan hak akses pengguna.</p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: `Beralih ke Tab ${userRoleName}`,
          cancelButtonText: 'Batal',
          confirmButtonColor: '#2563eb',
          cancelButtonColor: '#64748b'
        }).then((result) => {
          if (result.isConfirmed) {
            const targetConfig = DEFAULT_ROLE_ACCOUNTS.find((r) => r.role === user.role);
            if (targetConfig) handleSelectRole(targetConfig);
          }
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
          text: `Kata sandi yang Anda masukkan salah. Password default untuk peran ${getRoleLabel(selectedRole)} adalah "${currentRoleConfig.password}".`,
          confirmButtonColor: '#1e293b'
        });
        return;
      }

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
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col justify-center items-center py-6 px-4 select-none font-sans bg-gradient-to-b from-[#8ecbf8] via-[#c6e6fc] to-[#f2f9ff]">
      {/* Radial Atmospheric Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0)_60%)] pointer-events-none" />

      {/* Concentric Orbital Radar / Arc Rings */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
        <div className="w-[480px] h-[480px] rounded-full border border-white/50 animate-[spin_120s_linear_infinite]" />
        <div className="absolute inset-0 -m-[140px] rounded-full border border-white/40" />
        <div className="absolute inset-0 -m-[280px] rounded-full border border-white/30" />
        <div className="absolute inset-0 -m-[420px] rounded-full border border-white/20" />
      </div>

      {/* Realistic Layered Clouds Backdrop */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none z-0 h-[65vh] overflow-hidden opacity-95">
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
        <div className="absolute -inset-1.5 bg-gradient-to-b from-white/50 via-blue-200/25 to-indigo-300/35 rounded-[36px] blur-xl pointer-events-none -z-10" />

        <div className="relative w-full bg-white/90 backdrop-blur-2xl rounded-[32px] p-6 sm:p-7 shadow-[0_20px_50px_-10px_rgba(20,70,120,0.18),0_0_0_1px_rgba(255,255,255,0.95)_inset] border border-white/90 transition-all">
          
          {/* 1) LOGO APLIKASI */}
          <div className="flex flex-col items-center justify-center mb-2.5">
            <AppLogo settings={appSettings} size="lg" className="shadow-lg shadow-blue-500/20 transition-transform hover:scale-105" />
            <span className="text-xs font-extrabold tracking-tight text-slate-800 uppercase mt-2">
              {appSettings.appName}
            </span>
          </div>

          {/* 2) TANGGAL & JAM REALTIME */}
          <div className="flex items-center justify-center mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-700 text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{clock.dateFormatted}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{clock.timeFormatted}</span>
              </div>
            </div>
          </div>

          {/* 3) SAPAAN SESUAI WAKTU & MODE RUNNING TEXT */}
          <div className="text-center mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center justify-center gap-2">
              <span>{clock.greeting}</span>
              {renderGreetingIcon(clock.period)}
            </h1>

            {/* CONTAINER RUNNING TEXT / MODE STATIS */}
            <div className="mt-2">
              {runningTextMode === 'running' ? (
                <div className="relative overflow-hidden w-full rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50/80 to-sky-50 border border-sky-200/80 p-1.5 flex items-center gap-2 shadow-2xs group">
                  {/* Badge Label Running Text */}
                  <button
                    type="button"
                    onClick={handleToggleRunningTextMode}
                    title="Klik untuk beralih ke Mode Teks Statis"
                    className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition cursor-pointer"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                    </span>
                    <span className="text-[10px] font-extrabold tracking-wide uppercase">Info</span>
                  </button>

                  {/* Marquee Viewport dengan Mask Gradien Kiri & Kanan */}
                  <div
                    className="relative overflow-hidden flex-1 select-none [mask-image:linear-gradient(to_right,transparent,black_14px,black_calc(100%-14px),transparent)]"
                    title="Arahkan kursor untuk menjeda teks berjalan"
                  >
                    <div
                      className={`animate-running-text-smooth flex items-center gap-6 py-0.5 whitespace-nowrap text-xs text-slate-700 font-medium ${
                        !isMarqueePlaying ? 'animate-marquee-paused' : ''
                      }`}
                      style={{ animationDuration: `${marqueeDuration}s` }}
                    >
                      {/* Konten Diulang 2x agar Loop Berjalan Mulus Tanpa Jeda Kosong */}
                      {[1, 2].map((loopIdx) => (
                        <React.Fragment key={`marquee-loop-${loopIdx}`}>
                          {displayRunningItems.map((item, itemIdx) => (
                            <React.Fragment key={`item-${loopIdx}-${item.id || itemIdx}`}>
                              <div className="inline-flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-md shadow-2xs border ${getBadgeClass(
                                    item.badge
                                  )}`}
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                  <span>{item.badge}</span>
                                </span>
                                <span className="text-[11px] font-semibold text-slate-800">
                                  {item.text}
                                </span>
                              </div>
                              <span className="text-sky-300 font-black">•</span>
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Kontrol Cepat: Jeda/Putar & Tombol Switch Mode */}
                  <div className="shrink-0 flex items-center gap-1 pl-1 border-l border-sky-200/70">
                    <button
                      type="button"
                      onClick={() => setIsMarqueePlaying((prev) => !prev)}
                      className="p-1 text-slate-500 hover:text-blue-700 hover:bg-white rounded-lg transition cursor-pointer"
                      title={isMarqueePlaying ? 'Jeda Teks Berjalan' : 'Jalankan Teks Berjalan'}
                    >
                      {isMarqueePlaying ? (
                        <Pause className="w-3 h-3 text-slate-600" />
                      ) : (
                        <Play className="w-3 h-3 text-blue-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleRunningTextMode}
                      className="text-[10px] font-bold text-slate-500 hover:text-blue-700 px-1.5 py-0.5 rounded-md hover:bg-white transition cursor-pointer"
                      title="Klik untuk beralih ke teks statis"
                    >
                      Statis
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-xs text-slate-600 px-3.5 py-1.5 rounded-xl bg-sky-50/70 border border-sky-200/60 leading-relaxed font-normal max-w-[360px] mx-auto shadow-2xs">
                    {clock.greetingDescription}
                  </p>
                  <button
                    type="button"
                    onClick={handleToggleRunningTextMode}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-sky-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full transition cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                    <span>Aktifkan Mode Running Text</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ===================================================================== */}
          {/* TAMPILAN ROLE AKSES LEBIH PROPORSIONAL & SEIMBANG (3 + 2 GRID)        */}
          {/* ===================================================================== */}
          <div className="mb-4 p-2.5 bg-sky-50/80 rounded-2xl border border-sky-200/60 shadow-2xs">
            <div className="flex items-center justify-between px-0.5 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Pilih Role Akses:
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-md border border-blue-200/50">
                  5 Peran
                </span>
              </div>
              <span className="text-[10px] text-blue-700 font-bold bg-white border border-blue-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                Wajib Sesuai Role
              </span>
            </div>

            {/* Baris 1: 3 Role Tenaga Pendidik & Admin */}
            <div className="grid grid-cols-3 gap-1.5">
              {DEFAULT_ROLE_ACCOUNTS.slice(0, 3).map((cfg) => {
                const isSelected = selectedRole === cfg.role;
                const IconComponent = cfg.icon;
                const isAdmin = cfg.role === 'admin';
                return (
                  <button
                    key={cfg.role}
                    type="button"
                    id={`btn-role-${cfg.role}`}
                    onClick={() => handleSelectRole(cfg)}
                    className={`relative py-2 px-1.5 rounded-xl transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                      isSelected
                        ? 'bg-gradient-to-br from-blue-600 via-sky-600 to-indigo-600 text-white border-sky-300/90 shadow-md shadow-blue-500/25 ring-2 ring-sky-300/40 scale-[1.02]'
                        : 'bg-white/95 text-slate-700 hover:bg-white hover:text-blue-700 hover:border-sky-300 border-sky-100/90 shadow-2xs'
                    }`}
                    title={cfg.roleTitle}
                  >
                    <IconComponent
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected
                          ? isAdmin
                            ? 'text-amber-200 drop-shadow-xs'
                            : 'text-white'
                          : isAdmin
                          ? 'text-amber-600'
                          : 'text-blue-600'
                      }`}
                    />
                    <span className={`text-[11px] leading-tight font-bold tracking-tight whitespace-nowrap ${
                      isSelected ? 'text-white drop-shadow-xs' : 'text-slate-700'
                    }`}>
                      {cfg.label}
                    </span>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-300 rounded-full ring-2 ring-white shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Baris 2: 2 Role Siswa & Orang Tua */}
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {DEFAULT_ROLE_ACCOUNTS.slice(3, 5).map((cfg) => {
                const isSelected = selectedRole === cfg.role;
                const IconComponent = cfg.icon;
                const isStudent = cfg.role === 'siswa';
                return (
                  <button
                    key={cfg.role}
                    type="button"
                    id={`btn-role-${cfg.role}`}
                    onClick={() => handleSelectRole(cfg)}
                    className={`relative py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border text-center ${
                      isSelected
                        ? 'bg-gradient-to-br from-blue-600 via-sky-600 to-indigo-600 text-white border-sky-300/90 shadow-md shadow-blue-500/25 ring-2 ring-sky-300/40 scale-[1.02]'
                        : 'bg-white/95 text-slate-700 hover:bg-white hover:text-blue-700 hover:border-sky-300 border-sky-100/90 shadow-2xs'
                    }`}
                    title={cfg.roleTitle}
                  >
                    <IconComponent
                      className={`w-4 h-4 shrink-0 ${
                        isSelected
                          ? 'text-white'
                          : isStudent
                          ? 'text-emerald-600'
                          : 'text-indigo-600'
                      }`}
                    />
                    <span className={`text-[11px] leading-tight font-bold tracking-tight whitespace-nowrap ${
                      isSelected ? 'text-white drop-shadow-xs' : 'text-slate-700'
                    }`}>
                      {cfg.label}
                    </span>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-300 rounded-full ring-2 ring-white shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* DETAIL KREDENSIAL DEFAULT PERAN AKTIF */}
            <div className="mt-2 pt-2 border-t border-sky-200/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Peran Aktif:</span>
                  <span className="text-[11px] font-extrabold text-blue-900 truncate">
                    {currentRoleConfig.roleTitle}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  title="Klik untuk mengisi kembali username dan password default"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-blue-200/80 hover:bg-blue-50 shadow-2xs transition"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Isi Default</span>
                </button>
              </div>

              <div className="flex items-center justify-between bg-white/95 px-2.5 py-1.5 rounded-xl border border-sky-200/70 text-[11px] text-slate-600 shadow-2xs">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[10px] font-medium">User:</span>
                  <code className="font-mono font-bold text-blue-900 bg-sky-50 border border-sky-200/60 px-1.5 py-0.5 rounded text-[11px]">
                    {currentRoleConfig.username}
                  </code>
                </div>
                <span className="text-sky-200">•</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[10px] font-medium">Pass:</span>
                  <code className="font-mono font-bold text-blue-900 bg-sky-50 border border-sky-200/60 px-1.5 py-0.5 rounded text-[11px]">
                    {currentRoleConfig.password}
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* FORM LOGIN (MENGGUNAKAN USERNAME, BUKAN EMAIL)                       */}
          {/* ===================================================================== */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* USERNAME INPUT (MENGGANTIKAN EMAIL) */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-600 mb-1 px-1 uppercase tracking-wider">
                Username Akun ({getRoleLabel(selectedRole)})
              </label>
              <div className="bg-white hover:bg-sky-50/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/30 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 transition-all border border-sky-200/80 shadow-2xs">
                <UserIcon className="w-4 h-4 text-blue-500/70 shrink-0" />
                <input
                  id="input-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={`Username ${getRoleLabel(selectedRole)} (contoh: ${currentRoleConfig.username})`}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none font-medium"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* PASSWORD INPUT */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-600 mb-1 px-1 uppercase tracking-wider">
                Kata Sandi
              </label>
              <div className="bg-white hover:bg-sky-50/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/30 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 transition-all border border-sky-200/80 shadow-2xs">
                <Lock className="w-4 h-4 text-blue-500/70 shrink-0" />
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password akun"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none font-mono"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-blue-600 transition p-0.5 cursor-pointer shrink-0"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* LUPA PASSWORD */}
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                id="btn-forgot-password"
                onClick={handleForgotPassword}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition cursor-pointer"
              >
                Lupa password?
              </button>
            </div>

            {/* TOMBOL MASUK */}
            <button
              id="btn-masuk"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-700 hover:via-sky-700 hover:to-blue-800 active:scale-[0.99] text-white text-sm font-bold shadow-[0_6px_20px_rgba(37,99,235,0.35)] border-t border-white/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses Masuk...</span>
                </>
              ) : (
                <span>Masuk sebagai {getRoleLabel(selectedRole)}</span>
              )}
            </button>
          </form>

          {/* DIBUAT OLEH PUPUT SASMITA */}
          <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Code2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Dibuat oleh: <strong className="text-slate-800 font-semibold">{appSettings.creatorName || 'Puput Sasmita'}</strong>
            </span>
          </div>

        </div>
      </main>
    </div>
  );
};

