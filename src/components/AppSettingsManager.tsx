import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { AppSettings } from '../types';
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
  Code2
} from 'lucide-react';

interface AppSettingsManagerProps {
  onSettingsSaved?: (newSettings: AppSettings) => void;
}

export const AppSettingsManager: React.FC<AppSettingsManagerProps> = ({ onSettingsSaved }) => {
  const dbService = DatabaseService.getInstance();
  const [settings, setSettings] = useState<AppSettings>(dbService.getAppSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'logo'>('general');

  useEffect(() => {
    const unsub = dbService.subscribeAppSettings((updated) => {
      setSettings(updated);
    });
    return () => unsub();
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

  const handleSave = () => {
    if (!settings.appName.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Nama Aplikasi Wajib Diisi',
        text: 'Nama aplikasi tidak boleh kosong.'
      });
      return;
    }

    setIsSaving(true);
    setTimeout(() => {
      const saved = dbService.updateAppSettings(settings);
      setIsSaving(false);

      if (onSettingsSaved) {
        onSettingsSaved(saved);
      }

      Swal.fire({
        icon: 'success',
        title: 'Pengaturan Berhasil Disimpan',
        text: 'Identitas nama aplikasi, keterangan, dan logo telah diperbarui secara langsung di seluruh sistem.',
        timer: 1600,
        showConfirmButton: false
      });
    }, 250);
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
        </div>
      )}
    </div>
  );
};
