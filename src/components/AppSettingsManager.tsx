import React, { useState, useEffect, useRef } from 'react';
import { DatabaseService } from '../services/databaseService';
import { AppSettings, RunningTextItem } from '../types';
import { AppLogo } from './AppLogo';
import Swal from 'sweetalert2';
import {
  Settings,
  School,
  GraduationCap,
  BookOpen,
  Landmark,
  Award,
  Sparkles,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  CheckCircle2,
  Sparkle,
  Type,
  Phone,
  Code2,
  Megaphone,
  Plus,
  Trash2,
  Play,
  Pause,
  Sliders,
  MoveUp,
  MoveDown,
  AlertCircle
} from 'lucide-react';

interface AppSettingsManagerProps {
  onSettingsSaved?: (newSettings: AppSettings) => void;
  initialTab?: 'general' | 'logo' | 'running_text';
}

export const AppSettingsManager: React.FC<AppSettingsManagerProps> = ({ onSettingsSaved, initialTab }) => {
  const dbService = DatabaseService.getInstance();
  const [settings, setSettings] = useState<AppSettings>(dbService.getAppSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'logo' | 'running_text'>(initialTab || 'general');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving'>('synced');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const unsub = dbService.subscribeAppSettings((updated) => {
      setSettings(updated);
    });
    return () => {
      unsub();
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const presetIcons = [
    { id: 'School', name: 'Sekolah', icon: School },
    { id: 'GraduationCap', name: 'Akademik', icon: GraduationCap },
    { id: 'BookOpen', name: 'Buku', icon: BookOpen },
    { id: 'Landmark', name: 'Gedung', icon: Landmark },
    { id: 'Award', name: 'Prestasi', icon: Award },
    { id: 'Sparkles', name: 'Kreatif', icon: Sparkles },
    { id: 'ShieldCheck', name: 'Keamanan', icon: ShieldCheck }
  ];

  const presetColors = [
    { id: 'blue', label: 'Biru Utama', bgClass: 'bg-blue-600', borderClass: 'border-blue-600' },
    { id: 'indigo', label: 'Indigo Modern', bgClass: 'bg-indigo-600', borderClass: 'border-indigo-600' },
    { id: 'emerald', label: 'Zamrud Hijau', bgClass: 'bg-emerald-600', borderClass: 'border-emerald-600' },
    { id: 'purple', label: 'Ungu Elegan', bgClass: 'bg-purple-600', borderClass: 'border-purple-600' },
    { id: 'amber', label: 'Emas Hangat', bgClass: 'bg-amber-600', borderClass: 'border-amber-600' },
    { id: 'rose', label: 'Merah Muda', bgClass: 'bg-rose-600', borderClass: 'border-rose-600' }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Format Tidak Didukung',
        text: 'Harap unggah berkas gambar berformat PNG, JPG, WEBP, atau SVG.'
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Ukuran Terlalu Besar',
        text: 'Ukuran berkas gambar maksimal 2 MB agar performa tetap cepat.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSettings((prev) => ({
        ...prev,
        logoType: 'image',
        logoImageUrl: base64
      }));
    };
    reader.readAsDataURL(file);
  };

  const defaultRunningPresets: RunningTextItem[] = [
    {
      id: 'rt_1',
      badge: 'Sapaan',
      text: 'Tetap produktif mengawal aktivitas belajar mengajar hari ini.',
      isActive: true
    },
    {
      id: 'rt_2',
      badge: 'Sekolah',
      text: 'Selamat Datang di Portal Resmi {appName}',
      isActive: true
    },
    {
      id: 'rt_3',
      badge: 'Akademik',
      text: 'Tahun Ajaran 2024/2025 • Semester Aktif',
      isActive: true
    },
    {
      id: 'rt_4',
      badge: 'Presensi',
      text: 'Wajib lapor kehadiran harian & rekap administrasi tepat waktu',
      isActive: true
    },
    {
      id: 'rt_5',
      badge: 'Pengumuman',
      text: 'Mewujudkan ekosistem sekolah digital yang transparan, adaptif, dan berakhlak mulia',
      isActive: true
    }
  ];

  const runningTextItemsList = settings.runningTextItems !== undefined
    ? settings.runningTextItems
    : defaultRunningPresets;

  // Direct auto-sync helper for instant settings changes (toggle, move, delete, presets)
  const persistRunningTextDirectly = (
    nextSettings: AppSettings,
    immediateToast = false,
    toastTitle?: string
  ) => {
    setSettings(nextSettings);
    setSyncStatus('saving');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const saved = dbService.updateAppSettings(nextSettings);
    if (onSettingsSaved) {
      onSettingsSaved(saved);
    }

    setTimeout(() => {
      setSyncStatus('synced');
    }, 250);

    if (immediateToast) {
      Swal.fire({
        icon: 'success',
        title: toastTitle || 'Running Text Tersimpan',
        text: 'Perubahan langsung aktif dan tersinkronisasi di halaman login.',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  // Debounced auto-save for continuous typing (badge / text)
  const queueAutoSave = (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    setSyncStatus('saving');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      const saved = dbService.updateAppSettings(nextSettings);
      if (onSettingsSaved) {
        onSettingsSaved(saved);
      }
      setSyncStatus('synced');
    }, 600);
  };

  const handleSave = () => {
    if (!settings.appName.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Nama Aplikasi Wajib Diisi',
        text: 'Nama aplikasi tidak boleh kosong.'
      });
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    setIsSaving(true);
    setSyncStatus('saving');
    setTimeout(() => {
      const toSave: AppSettings = {
        ...settings,
        runningTextItems: settings.runningTextItems !== undefined ? settings.runningTextItems : defaultRunningPresets
      };
      const saved = dbService.updateAppSettings(toSave);
      setSettings(saved);
      setSyncStatus('synced');
      setIsSaving(false);

      if (onSettingsSaved) {
        onSettingsSaved(saved);
      }

      Swal.fire({
        icon: 'success',
        title: activeTab === 'running_text' ? 'Running Text Berhasil Disimpan' : 'Pengaturan Berhasil Disimpan',
        text: activeTab === 'running_text'
          ? 'Daftar pesan dan konfigurasi running text login telah diperbarui dan langsung aktif di halaman login.'
          : 'Identitas nama aplikasi, keterangan, dan logo telah diperbarui secara langsung di seluruh sistem.',
        timer: 1600,
        showConfirmButton: false
      });
    }, 200);
  };

  const handleAddRunningItem = () => {
    const newItem: RunningTextItem = {
      id: `rt_${Date.now()}`,
      badge: 'Pengumuman',
      text: '',
      isActive: true
    };
    const nextSettings: AppSettings = {
      ...settings,
      runningTextItems: [...runningTextItemsList, newItem]
    };
    persistRunningTextDirectly(nextSettings);
  };

  const handleToggleRunningItem = (id: string) => {
    const updated = runningTextItemsList.map(item =>
      item.id === id ? { ...item, isActive: !item.isActive } : item
    );
    const nextSettings: AppSettings = { ...settings, runningTextItems: updated };
    persistRunningTextDirectly(nextSettings);
  };

  const handleUpdateRunningItem = (id: string, field: 'badge' | 'text', val: string) => {
    const updated = runningTextItemsList.map(item =>
      item.id === id ? { ...item, [field]: val } : item
    );
    const nextSettings: AppSettings = { ...settings, runningTextItems: updated };
    queueAutoSave(nextSettings);
  };

  const handleDeleteRunningItem = (id: string) => {
    const updated = runningTextItemsList.filter(item => item.id !== id);
    const nextSettings: AppSettings = { ...settings, runningTextItems: updated };
    persistRunningTextDirectly(nextSettings);
  };

  const handleMoveRunningItem = (index: number, direction: 'up' | 'down') => {
    const list = [...runningTextItemsList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    const nextSettings: AppSettings = { ...settings, runningTextItems: list };
    persistRunningTextDirectly(nextSettings);
  };

  const handleResetRunningPresets = () => {
    Swal.fire({
      title: 'Kembalikan Running Text Bawaan?',
      text: 'Daftar pesan running text akan dikembalikan ke setelan standar dan langsung disinkronkan ke layar login.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563EB',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Kembalikan & Sinkronkan',
      cancelButtonText: 'Batal'
    }).then((res) => {
      if (res.isConfirmed) {
        const nextSettings: AppSettings = {
          ...settings,
          runningTextSpeed: 28,
          runningTextIncludeGreeting: true,
          runningTextItems: defaultRunningPresets
        };
        persistRunningTextDirectly(nextSettings, true, 'Template Bawaan Berhasil Diterapkan');
      }
    });
  };

  const handleResetDefault = () => {
    Swal.fire({
      title: 'Kembalikan ke Default?',
      text: 'Nama aplikasi, keterangan, dan logo akan dikembalikan ke setelan awal (SIMAK).',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563EB',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Kembalikan',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        const defaultSettings: AppSettings = {
          appName: 'SIMAK',
          appDescription: 'Sistem Informasi Manajemen Kelas',
          logoType: 'icon',
          logoIcon: 'School',
          logoColor: 'blue',
          logoImageUrl: '',
          creatorName: 'Puput Sasmita',
          adminPhone: '0812-3456-7890'
        };
        setSettings(defaultSettings);
        dbService.updateAppSettings(defaultSettings);
        if (onSettingsSaved) onSettingsSaved(defaultSettings);
        Swal.fire({
          icon: 'success',
          title: 'Diatur Ulang',
          text: 'Pengaturan identitas aplikasi berhasil dikembalikan ke standar.',
          timer: 1400,
          showConfirmButton: false
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              Pengaturan Identitas & Logo Aplikasi
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Kelola nama sistem, deskripsi keterangan, dan ikon/logo resmi untuk header dan halaman login
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          <span className="flex items-center gap-1.5 text-amber-300">
            <Sparkle className="w-3.5 h-3.5" />
            Pratinjau Langsung (Live Preview Header & Brand)
          </span>
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-200">
            Responsif & Waktu Nyata
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3">
            <AppLogo settings={settings} size="md" />
            <div>
              <h1 className="text-base font-black leading-tight text-slate-900 dark:text-white">
                {settings.appName || 'Nama Aplikasi'}
              </h1>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                {settings.appDescription || 'Keterangan Aplikasi'}
              </p>
            </div>
          </div>
          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg shrink-0 hidden sm:block">
            Tersinkronisasi
          </div>
        </div>
      </div>

      {/* Form Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'general'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>Nama & Keterangan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logo')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'logo'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Pengaturan Logo</span>
        </button>
        <button
          id="tab-edit-running-text"
          type="button"
          onClick={() => setActiveTab('running_text')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'running_text'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4 text-amber-400" />
          <span>Edit Running Text Login</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'running_text'
              ? 'bg-white/20 text-white'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
          }`}>
            {runningTextItemsList.filter(i => i.isActive).length} Aktif
          </span>
        </button>
      </div>

      {/* TAB CONTENT: General */}
      {activeTab === 'general' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5 shadow-xs">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-1.5">
              Nama Aplikasi / Sekolah <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-app-name"
              type="text"
              value={settings.appName}
              onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
              placeholder="contoh: SIMAK, SMA Negeri 1 Prestasi, dll."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-semibold"
            />
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-medium">
              Nama ini akan muncul di bagian kiri atas bilah navigasi header, halaman login, serta laporan resmi.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-1.5">
              Keterangan / Slogan / Subtitle Aplikasi
            </label>
            <input
              id="input-app-description"
              type="text"
              value={settings.appDescription}
              onChange={(e) => setSettings({ ...settings, appDescription: e.target.value })}
              placeholder="contoh: Sistem Informasi Manajemen Kelas, Portal Akademik & Presensi Terpadu"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-medium">
              Deskripsi ringkas yang memberi informasi tentang modul dan fungsi sistem kepada pengguna.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Nama Pembuat / Pengembang Sistem (Footer)</span>
            </label>
            <input
              id="input-creator-name"
              type="text"
              value={settings.creatorName || ''}
              onChange={(e) => setSettings({ ...settings, creatorName: e.target.value })}
              placeholder="contoh: Puput Sasmita"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-medium"
            />
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-medium">
              Nama ini akan ditampilkan pada bagian paling bawah halaman login dan bilah footer aplikasi (menggantikan tulisan perlindungan/enkripsi).
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Nomor WhatsApp Admin (Bantuan Lupa Kata Sandi)</span>
            </label>
            <input
              id="input-admin-phone"
              type="text"
              value={settings.adminPhone || ''}
              onChange={(e) => setSettings({ ...settings, adminPhone: e.target.value })}
              placeholder="contoh: 0812-3456-7890 atau 6281234567890"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono"
            />
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-medium">
              Nomor WhatsApp resmi admin sekolah yang akan otomatis muncul dan dapat langsung dihubungi oleh pengguna saat mengeklik tombol "Lupa kata sandi?".
            </p>
          </div>

          {/* Bottom Save Button for General Settings */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Perubahan nama, deskripsi, dan kontak admin akan langsung tersinkron di seluruh portal.</span>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Nama & Keterangan'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Logo */}
      {activeTab === 'logo' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6 shadow-xs">
          {/* Logo Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-2">
              Pilih Sumber Logo:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, logoType: 'icon' })}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
                  settings.logoType === 'icon'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20'
                    : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Preset Ikon Sekolah</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Pilihan lambang vektor modern</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, logoType: 'image' })}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
                  settings.logoType === 'image'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20'
                    : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Gambar / Logo Kustom</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Unggah berkas atau URL gambar</div>
                </div>
              </button>
            </div>
          </div>

          {/* If Preset Icon Selected */}
          {settings.logoType === 'icon' && (
            <div className="space-y-5 pt-3 border-t border-slate-200 dark:border-slate-700">
              {/* Icon Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Pilih Lambang Ikon:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {presetIcons.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = settings.logoIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, logoIcon: item.id })}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-bold shadow-2xs'
                            : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-medium'
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                        <span className="text-[11px]">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Pilih Warna Aksen Latar Belakang:
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  {presetColors.map((color) => {
                    const isSelected = settings.logoColor === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, logoColor: color.id })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? `${color.borderClass} ring-2 ring-offset-2 ring-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold`
                            : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${color.bgClass} shrink-0`} />
                        <span>{color.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* If Custom Image Selected */}
          {settings.logoType === 'image' && (
            <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-1.5">
                  Unggah Berkas Gambar Logo:
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs">
                    <Upload className="w-4 h-4" />
                    <span>Pilih Gambar dari Komputer</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    Mendukung format PNG, JPG, SVG atau WEBP (Maksimal 2 MB)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-1.5">
                  Atau Masukkan Tautan / URL Gambar:
                </label>
                <input
                  id="input-logo-url"
                  type="url"
                  value={settings.logoImageUrl || ''}
                  onChange={(e) => setSettings({ ...settings, logoImageUrl: e.target.value })}
                  placeholder="https://example.com/logo-sekolah.png"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              {/* Image Preview Box */}
              {settings.logoImageUrl && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
                  <div className="w-12 h-12 rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden bg-white">
                    <img
                      src={settings.logoImageUrl}
                      alt="Pratinjau Logo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Pratinjau Berhasil Dimuat</div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, logoImageUrl: '' })}
                      className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Hapus Gambar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Save Button for Logo Settings */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Logo yang dipilih akan tampil pada navbar atas, kartu login, dan kop cetak laporan.</span>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Logo'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Running Text Login (Khusus Role Admin) */}
      {activeTab === 'running_text' && (
        <div className="space-y-6">
          {/* Intro Box */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Pengaturan & Edit Running Text Halaman Login
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Sesuaikan pengumuman, sapaan dinamis, dan teks berjalan yang tampil di layar masuk (login).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition ${
                  syncStatus === 'saving'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${syncStatus === 'saving' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></span>
                  <span>{syncStatus === 'saving' ? 'Menyinkronkan...' : '✓ Tersinkron Otomatis ke Login'}</span>
                </div>

                <button
                  type="button"
                  onClick={handleResetRunningPresets}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  title="Kembalikan pesan ke template rekomendasi"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Preset Bawaan</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddRunningItem}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Pesan</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Simpan secara manual sekarang"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Sekarang'}</span>
                </button>
              </div>
            </div>

            {/* Live Interactive Marquee Preview Card */}
            <div className="rounded-xl bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 p-4 border border-slate-700 text-white shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-amber-300 uppercase tracking-wider">Simulasi Tampilan di Layar Login</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                    className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    {isPreviewPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isPreviewPlaying ? 'Jeda' : 'Putar'}</span>
                  </button>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300">
                    Durasi: {settings.runningTextSpeed || 28}s
                  </span>
                </div>
              </div>

              {/* Marquee Display Container */}
              <div className="rounded-xl bg-slate-800/90 border border-slate-700 p-2 overflow-hidden relative [mask-image:linear-gradient(to_right,transparent,black_14px,black_calc(100%-14px),transparent)]">
                <div
                  className={`animate-running-text-smooth flex items-center gap-6 whitespace-nowrap text-xs font-medium text-slate-200 py-0.5 ${
                    !isPreviewPlaying ? 'animate-marquee-paused' : ''
                  }`}
                  style={{ animationDuration: `${settings.runningTextSpeed || 28}s` }}
                >
                  {[1, 2].map((loop) => (
                    <React.Fragment key={`preview-loop-${loop}`}>
                      {settings.runningTextIncludeGreeting !== false && (
                        <>
                          <div className="inline-flex items-center gap-1.5 shrink-0">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-900/60 border border-blue-700 px-1.5 py-0.2 rounded-md">
                              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                              <span>Sapaan</span>
                            </span>
                            <span className="text-[11px] font-semibold text-slate-100">
                              Selamat Datang di Portal Resmi {settings.appName || 'SIMAK'} (Sinkron Waktu Otomatis)
                            </span>
                          </div>
                          <span className="text-sky-400 font-black">•</span>
                        </>
                      )}

                      {runningTextItemsList
                        .filter((item) => item.isActive)
                        .map((item, idx) => (
                          <React.Fragment key={`prev-item-${loop}-${item.id || idx}`}>
                            <div className="inline-flex items-center gap-1.5 shrink-0">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-900/60 border border-indigo-700 px-1.5 py-0.2 rounded-md">
                                <span>{item.badge || 'Info'}</span>
                              </span>
                              <span className="text-[11px] font-semibold text-slate-100">
                                {(item.text || 'Teks pengumuman...').replace(/\{appName\}/g, settings.appName || 'SIMAK')}
                              </span>
                            </div>
                            <span className="text-sky-400 font-black">•</span>
                          </React.Fragment>
                        ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Global Options: Greeting & Animation Speed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Option 1: Sapaan Waktu Otomatis */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Sertakan Sapaan Waktu Otomatis
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    Menyisipkan sapaan ramah sesuai waktu (Pagi/Siang/Sore/Malam) di urutan pertama.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.runningTextIncludeGreeting !== false}
                    onChange={(e) => {
                      const nextSettings = { ...settings, runningTextIncludeGreeting: e.target.checked };
                      persistRunningTextDirectly(nextSettings);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Option 2: Kecepatan Putaran (Durasi) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-blue-500" />
                    Kecepatan Gerak Running Text
                  </span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {(settings.runningTextSpeed || 28) >= 60
                      ? '60 Detik (1 Menit) / Putaran'
                      : `${settings.runningTextSpeed || 28} Detik / Putaran`}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="1"
                  value={settings.runningTextSpeed || 28}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    const nextSettings = { ...settings, runningTextSpeed: val };
                    queueAutoSave(nextSettings);
                  }}
                  className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
                <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-600 dark:text-slate-300 font-medium text-center">
                  <button
                    type="button"
                    onClick={() => {
                      const nextSettings = { ...settings, runningTextSpeed: 15 };
                      persistRunningTextDirectly(nextSettings);
                    }}
                    className="py-1 px-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer font-bold"
                  >
                    Cepat (15s)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextSettings = { ...settings, runningTextSpeed: 28 };
                      persistRunningTextDirectly(nextSettings);
                    }}
                    className="py-1 px-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer font-bold"
                  >
                    Standar (28s)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextSettings = { ...settings, runningTextSpeed: 45 };
                      persistRunningTextDirectly(nextSettings);
                    }}
                    className="py-1 px-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer font-bold"
                  >
                    Santai (45s)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextSettings = { ...settings, runningTextSpeed: 60 };
                      persistRunningTextDirectly(nextSettings);
                    }}
                    className="py-1 px-1 rounded border border-blue-400 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 cursor-pointer font-bold"
                  >
                    1 Menit (60s)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Messages List Section */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Daftar Pesan & Konten Running Text ({runningTextItemsList.length} Item)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Gunakan <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-bold">&#123;appName&#125;</code> untuk memanggil nama sekolah otomatis.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRunningItem}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pesan Baru</span>
              </button>
            </div>

            {/* List of Messages */}
            <div className="space-y-3">
              {runningTextItemsList.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                  <Megaphone className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum ada item pesan running text</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Tambah pesan baru atau klik 'Preset Bawaan' untuk memuat template pengumuman sekolah.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={handleAddRunningItem}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
                    >
                      + Tambah Pesan
                    </button>
                    <button
                      type="button"
                      onClick={handleResetRunningPresets}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Gunakan Preset Bawaan
                    </button>
                  </div>
                </div>
              ) : (
                runningTextItemsList.map((item, index) => {
                const badgePresets = ['Pengumuman', 'Sekolah', 'Akademik', 'Presensi', 'Peringatan', 'Motivasi'];

                return (
                  <div
                    key={item.id || index}
                    className={`p-4 rounded-xl border transition-all ${
                      item.isActive
                        ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-300 dark:border-slate-700 shadow-2xs'
                        : 'bg-slate-100/40 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 opacity-65'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {/* Order & Reorder Controls */}
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveRunningItem(index, 'up')}
                            className="p-1 text-slate-500 hover:text-blue-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            title="Pindah ke Atas"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 px-1">
                            #{index + 1}
                          </span>
                          <button
                            type="button"
                            disabled={index === runningTextItemsList.length - 1}
                            onClick={() => handleMoveRunningItem(index, 'down')}
                            className="p-1 text-slate-500 hover:text-blue-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            title="Pindah ke Bawah"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Status Aktif Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleRunningItem(item.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            item.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          ></span>
                          <span>{item.isActive ? 'Aktif Tayang' : 'Dinonaktifkan'}</span>
                        </button>
                      </div>

                      {/* Delete Button */}
                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleDeleteRunningItem(item.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition flex items-center gap-1 cursor-pointer"
                          title="Hapus Pesan Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>

                    {/* Badge & Text Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      {/* Badge Selection */}
                      <div className="sm:col-span-1 space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Label / Kategori:
                        </label>
                        <input
                          type="text"
                          value={item.badge}
                          onChange={(e) => handleUpdateRunningItem(item.id, 'badge', e.target.value)}
                          placeholder="e.g. Pengumuman"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {/* Quick Badge Chips */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {badgePresets.map((bp) => (
                            <button
                              key={bp}
                              type="button"
                              onClick={() => handleUpdateRunningItem(item.id, 'badge', bp)}
                              className={`text-[10px] px-1.5 py-0.5 rounded border transition cursor-pointer ${
                                item.badge === bp
                                  ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/60 dark:text-blue-200'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {bp}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Content Textarea */}
                      <div className="sm:col-span-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Isi Teks Pesan Berjalan:
                          </label>
                          <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                            {(item.text || '').length} Karakter
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={item.text}
                          onChange={(e) => handleUpdateRunningItem(item.id, 'text', e.target.value)}
                          placeholder="Tuliskan isi pengumuman, pengingat, atau info penting di sini..."
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                );
              }))}
            </div>

            {/* Bottom Save Reminder */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${syncStatus === 'saving' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></div>
                <span>
                  {syncStatus === 'saving'
                    ? 'Menyinkronkan perubahan ke sistem...'
                    : 'Semua perubahan running text tersinkronisasi secara waktu nyata ke layar login.'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
