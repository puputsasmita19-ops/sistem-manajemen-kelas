import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { User, UserRole, AppSettings } from '../types';
import { useRealtimeClock } from '../utils/timeUtils';
import { AppLogo } from './AppLogo';
import Swal from 'sweetalert2';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Code2,
  Calendar,
  Clock,
  Sun,
  SunMedium,
  Sunset,
  Moon
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

interface DemoRoleConfig {
  role: UserRole;
  label: string;
  roleTitle: string;
  username: string;
  password: string;
  email: string;
  name: string;
  iconEmoji: string;
}

const DEMO_ROLES: DemoRoleConfig[] = [
  {
    role: 'admin',
    label: 'Admin',
    roleTitle: 'Administrator Sekolah',
    username: 'admin',
    password: 'admin123',
    email: 'admin@sekolah.id',
    name: 'Bambang Wijaya, M.Kom',
    iconEmoji: '👑'
  },
  {
    role: 'wali_kelas',
    label: 'Wali Kelas',
    roleTitle: 'Wali Kelas X MIPA 1',
    username: 'walikelas',
    password: 'wali123',
    email: 'walikelas@sekolah.id',
    name: 'Budi Santoso, S.Pd',
    iconEmoji: '🎓'
  },
  {
    role: 'guru',
    label: 'Guru Mapel',
    roleTitle: 'Guru Matematika',
    username: 'guru',
    password: 'guru123',
    email: 'guru@sekolah.id',
    name: 'Siti Rahmawati, M.Pd',
    iconEmoji: '👨‍🏫'
  },
  {
    role: 'siswa',
    label: 'Siswa',
    roleTitle: 'Siswa X MIPA 1',
    username: 'siswa',
    password: 'siswa123',
    email: 'siswa@sekolah.id',
    name: 'Ahmad Rizky Pratama',
    iconEmoji: '🎒'
  },
  {
    role: 'orang_tua',
    label: 'Orang Tua',
    roleTitle: 'Wali Murid Siswa',
    username: 'ortu',
    password: 'ortu123',
    email: 'ortu@sekolah.id',
    name: 'Hendra Pratama (Ayah Ahmad)',
    iconEmoji: '👨‍👦'
  }
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const dbService = DatabaseService.getInstance();
  const clock = useRealtimeClock();

  const [appSettings, setAppSettings] = useState<AppSettings>(dbService.getAppSettings());
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [emailOrUser, setEmailOrUser] = useState('admin@sekolah.id');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsub = dbService.subscribeAppSettings((updated) => {
      setAppSettings(updated);
    });
    return () => unsub();
  }, []);

  const handleSelectRole = (config: DemoRoleConfig) => {
    setSelectedRole(config.role);
    setEmailOrUser(config.email);
    setPassword(config.password);
  };

  const processLogin = (targetUserOrEmail: string, targetPass: string) => {
    const trimmedInput = targetUserOrEmail.trim();
    if (!trimmedInput) {
      Swal.fire({
        icon: 'warning',
        title: 'Email / Username Kosong',
        text: 'Silakan masukkan email atau username akun Anda.',
        confirmButtonColor: '#1e293b'
      });
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Find user by username or match demo emails or user attributes
      const allUsers = dbService.getAllUsers();
      let user = allUsers.find(
        (u) =>
          u.username.toLowerCase() === trimmedInput.toLowerCase() ||
          (u.email && u.email.toLowerCase() === trimmedInput.toLowerCase())
      );

      // Also map demo role emails if user typed one of the preset emails
      if (!user) {
        const demoMatch = DEMO_ROLES.find(
          (d) => d.email.toLowerCase() === trimmedInput.toLowerCase()
        );
        if (demoMatch) {
          user = dbService.findUserByUsername(demoMatch.username);
        }
      }

      if (!user) {
        setIsLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Akun Tidak Ditemukan',
          text: `Akun "${trimmedInput}" belum terdaftar pada sistem ${appSettings.appName}. Silakan gunakan salah satu pintasan peran di atas atau periksa username/email Anda.`,
          confirmButtonColor: '#1e293b'
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
          text: 'Silakan periksa kembali kata sandi akun Anda.',
          confirmButtonColor: '#1e293b'
        });
        return;
      }

      setIsLoading(false);
      Swal.fire({
        icon: 'success',
        title: `Selamat Datang, ${user.nama}!`,
        text: `Berhasil masuk ke portal ${appSettings.appName}`,
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
            Jika Anda lupa email, username, atau kata sandi akun <strong>${appSettings.appName}</strong>, silakan hubungi kontak Administrator Sistem atau staf Tata Usaha Sekolah berikut:
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
            <span class="font-bold">Tips Pintas:</span>
            <span>Anda juga dapat memilih salah satu peran di bagian atas form untuk mengisi kredensial secara otomatis.</span>
          </div>
        </div>
      `,
      confirmButtonText: 'Tutup',
      confirmButtonColor: '#1e293b'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processLogin(emailOrUser, password);
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
      {/* ========================================================================= */}
      {/* REALISTIC SKY & CLOUDS ATMOSPHERE (Matching uploaded image)               */}
      {/* ========================================================================= */}

      {/* Atmospheric Soft Light Radial Center */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0)_60%)] pointer-events-none" />

      {/* Concentric Orbital Radar / Arc Rings Behind the Card */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
        <div className="w-[480px] h-[480px] rounded-full border border-white/50 animate-[spin_120s_linear_infinite]" />
        <div className="absolute inset-0 -m-[140px] rounded-full border border-white/40" />
        <div className="absolute inset-0 -m-[280px] rounded-full border border-white/30" />
        <div className="absolute inset-0 -m-[420px] rounded-full border border-white/20" />
      </div>

      {/* Realistic Layered Clouds (SVG Backdrop) */}
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

          {/* Distant Soft Mist Cloud Bank */}
          <g filter="url(#cloudDistantBlur)" opacity="0.6">
            <ellipse cx="220" cy="420" rx="340" ry="140" fill="url(#cloudGrad1)" />
            <ellipse cx="720" cy="450" rx="420" ry="160" fill="url(#cloudGrad1)" />
            <ellipse cx="1260" cy="410" rx="360" ry="150" fill="url(#cloudGrad1)" />
          </g>

          {/* Midground Billowing Cumulus Clouds */}
          <g filter="url(#cloudSoftBlur)" opacity="0.85">
            <path
              d="M-50 600 C 60 480, 200 420, 360 450 C 490 350, 680 370, 780 440 C 900 340, 1100 350, 1220 420 C 1320 370, 1450 430, 1500 520 L 1500 600 Z"
              fill="url(#cloudGrad1)"
            />
          </g>

          {/* Foreground Crisp Fluffy Clouds with Natural Depth */}
          <path
            d="M-40 600 C 40 500, 160 460, 280 490 C 360 410, 520 400, 620 470 C 700 420, 840 430, 920 480 C 1040 390, 1220 400, 1340 470 C 1410 430, 1480 480, 1520 560 L 1520 600 Z"
            fill="url(#cloudGrad2)"
          />

          {/* Ambient Floating Cloud Tufts Left & Right */}
          <ellipse cx="120" cy="380" rx="180" ry="75" fill="#ffffff" opacity="0.8" />
          <ellipse cx="1320" cy="360" rx="200" ry="80" fill="#ffffff" opacity="0.85" />
          <ellipse cx="40" cy="450" rx="240" ry="90" fill="#ffffff" opacity="0.9" />
          <ellipse cx="1400" cy="440" rx="260" ry="95" fill="#ffffff" opacity="0.9" />
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* MAIN LOGIN CARD CONTAINER (Faithful to Uploaded Design)                   */}
      {/* ========================================================================= */}
      <main className="relative z-10 w-full max-w-[430px] px-2 sm:px-0">
        {/* Soft Multi-Layer Ambient Glow Behind the Card */}
        <div className="absolute -inset-1.5 bg-gradient-to-b from-white/40 via-blue-200/20 to-indigo-300/30 rounded-[36px] blur-xl pointer-events-none -z-10" />

        <div className="relative w-full bg-white/85 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 shadow-[0_20px_50px_-10px_rgba(20,70,120,0.18),0_0_0_1px_rgba(255,255,255,0.95)_inset] border border-white/90 transition-all">
          
          {/* 1) LOGO SIMAK DI DALAM KOTAK LOGIN */}
          <div className="flex flex-col items-center justify-center mb-3">
            <AppLogo settings={appSettings} size="lg" className="shadow-lg shadow-blue-500/20 transition-transform hover:scale-105" />
            <span className="text-xs font-extrabold tracking-tight text-slate-800 uppercase mt-2">
              {appSettings.appName}
            </span>
          </div>

          {/* 1 & 2) TANGGAL, HARI & JAM REALTIME DI DALAM KOTAK */}
          <div className="flex items-center justify-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-700 text-xs shadow-2xs">
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

          {/* 3) SAPAAN SESUAI KONDISI JAM (Pagi, Siang, Sore, Malam) */}
          <div className="text-center mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center justify-center gap-2">
              <span>{clock.greeting}</span>
              {renderGreetingIcon(clock.period)}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-[320px] mx-auto leading-relaxed">
              {clock.greetingDescription}
            </p>
          </div>

          {/* INTEGRATED ROLE SELECTION CHIPS (Praktis 1-Klik) */}
          <div className="mb-4 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/60">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Pilih Peran Akun:
              </span>
              <span className="text-[10px] text-blue-600 font-semibold">1-Klik Otomatis</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {DEMO_ROLES.map((cfg) => {
                const isSelected = selectedRole === cfg.role;
                return (
                  <button
                    key={cfg.role}
                    type="button"
                    onClick={() => handleSelectRole(cfg)}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200 scale-[1.02]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                    title={cfg.roleTitle}
                  >
                    <span className="text-xs leading-none">{cfg.iconEmoji}</span>
                    <span className="truncate text-[10px]">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* EMAIL INPUT */}
            <div className="relative">
              <div className="bg-slate-100/90 hover:bg-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-400/40 rounded-xl px-4 py-3 flex items-center gap-3 transition-all border border-slate-200/50">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  id="input-email-or-username"
                  type="text"
                  required
                  value={emailOrUser}
                  onChange={(e) => setEmailOrUser(e.target.value)}
                  placeholder="Email atau Username"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none font-medium"
                />
              </div>
            </div>

            {/* PASSWORD INPUT */}
            <div className="relative">
              <div className="bg-slate-100/90 hover:bg-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-400/40 rounded-xl px-4 py-3 flex items-center gap-3 transition-all border border-slate-200/50">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 transition p-0.5 cursor-pointer shrink-0"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 4) FORGOT PASSWORD DIGANTI "Lupa password?" */}
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                id="btn-forgot-password"
                onClick={handleForgotPassword}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium transition cursor-pointer"
              >
                Lupa password?
              </button>
            </div>

            {/* 5) GET STARTED DIGANTI "Masuk" */}
            <button
              id="btn-masuk"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-b from-[#252830] via-[#1a1d24] to-[#101217] hover:from-[#2e323c] hover:to-[#171920] active:scale-[0.99] text-white text-sm font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.18)] border-t border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Masuk</span>
              )}
            </button>
          </form>

          {/* 7) DIBUAT OLEH PUPUT DIMASUKKAN KE DALAM KOTAK DI HALAMAN LOGIN BAGIAN BAWAH */}
          <div className="mt-5 pt-3.5 border-t border-slate-200/80 flex items-center justify-center gap-2 text-xs text-slate-500">
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
