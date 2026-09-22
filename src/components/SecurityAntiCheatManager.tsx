import React, { useState } from 'react';
import { AppSettings, User } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  Bell,
  BellOff,
  AlertCircle,
  MapPin,
  Crosshair,
  CheckCircle2,
  Lock,
  Eye,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import Swal from 'sweetalert2';
import { DatabaseService } from '../services/databaseService';
import { AntiCheatSecurityService } from '../services/antiCheatSecurityService';

interface SecurityAntiCheatManagerProps {
  appSettings: AppSettings;
  currentUser: User;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SecurityAntiCheatManager: React.FC<SecurityAntiCheatManagerProps> = ({
  appSettings,
  currentUser,
  onUpdateSettings
}) => {
  const [settings, setSettings] = useState<AppSettings>(appSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Sync internal state when parent props change
  React.useEffect(() => {
    setSettings(appSettings);
  }, [appSettings]);

  const handleToggleSecuritySetting = (key: keyof AppSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    onUpdateSettings(updated);
  };

  const handleDetectSchoolLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire({
        icon: 'error',
        title: 'Geolokasi Tidak Didukung',
        text: 'Peramban ini tidak mendukung pendeteksian lokasi GPS otomatis.'
      });
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        const updated = {
          ...settings,
          schoolLatitude: lat,
          schoolLongitude: lng
        };
        setSettings(updated);
        onUpdateSettings(updated);
        setIsDetectingLocation(false);

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Lokasi GPS Terkunci!',
          text: `Koordinat: ${lat}, ${lng}`,
          timer: 3000,
          showConfirmButton: false
        });
      },
      (error) => {
        setIsDetectingLocation(false);
        Swal.fire({
          icon: 'warning',
          title: 'Izin Lokasi Dibutuhkan',
          text: `Gagal membaca GPS: ${error.message}. Pastikan izin lokasi telah diizinkan pada peramban.`
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    setTimeout(() => {
      onUpdateSettings(settings);
      setIsSaving(false);

      DatabaseService.getInstance().logActivity(
        'settings_update',
        'Pembaruan Pengaturan Keamanan & Anti-Cheat',
        `Memperbarui setelan keamanan & anti-cheat (Master: ${settings.antiCheatEnabled !== false ? 'ON' : 'OFF'}, Pop-up: ${settings.antiCheatSecurityPopupsEnabled !== false ? 'ON' : 'OFF'})`,
        'security_settings'
      );

      Swal.fire({
        icon: 'success',
        title: 'Pengaturan Keamanan Disimpan!',
        text: 'Seluruh konfigurasi sistem keamanan & anti-cheat telah aktif secara real-time.',
        confirmButtonText: 'Selesai',
        confirmButtonColor: '#059669'
      });
    }, 400);
  };

  const handleTestToast = () => {
    AntiCheatSecurityService.getInstance().triggerTestPopup(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                Pusat Keamanan & Anti-Cheat Sistem
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                Menu Sistem & Keamanan
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
              Konfigurasi proteksi peramban, anti-cheat ujian, pemblokiran DevTools/inspeksi, dan pembatasan radius presensi GPS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleTestToast}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Uji coba pop-up peringatan"
          >
            <Bell className="w-4 h-4 text-amber-500" />
            <span>Tes Pop-Up</span>
          </button>

          <button
            type="button"
            id="btn-save-security-settings"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>

      {/* Overview Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Status Master Shield</span>
            <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${settings.antiCheatEnabled !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{settings.antiCheatEnabled !== false ? 'Aktif Menyeluruh' : 'Dinonaktifkan'}</span>
            </div>
          </div>
          <div className={`p-2.5 rounded-xl ${settings.antiCheatEnabled !== false ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Modus Pop-Up Toast</span>
            <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${settings.antiCheatSecurityPopupsEnabled !== false ? 'bg-blue-500' : 'bg-slate-400'}`} />
              <span>{settings.antiCheatSecurityPopupsEnabled !== false ? 'Notifikasi Muncul' : 'Mode Hening (Silent)'}</span>
            </div>
          </div>
          <div className={`p-2.5 rounded-xl ${settings.antiCheatSecurityPopupsEnabled !== false ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}>
            <Bell className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Validasi Radius Presensi</span>
            <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{settings.schoolRadiusMeters ?? 200} Meter dari Sekolah</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <MapPin className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* CARD 1: MASTER SHIELD & SISTEM ANTI-CHEAT */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${settings.antiCheatEnabled !== false ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Master Shield: Proteksi Sistem & Anti-Rekayasa
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Saklar utama untuk mengaktifkan atau menonaktifkan seluruh perlindungan peramban web
              </p>
            </div>
          </div>

          <button
            id="toggle-anticheat-master"
            type="button"
            onClick={() => {
              const nextVal = !(settings.antiCheatEnabled !== false);
              handleToggleSecuritySetting('antiCheatEnabled', nextVal);
              Swal.fire({
                toast: true,
                position: 'top-end',
                icon: nextVal ? 'success' : 'warning',
                title: nextVal ? 'Sistem Anti-Cheat Dinyalakan' : 'Sistem Anti-Cheat Dinonaktifkan',
                showConfirmButton: false,
                timer: 2000
              });
            }}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.antiCheatEnabled !== false ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            role="switch"
            aria-checked={settings.antiCheatEnabled !== false}
            title="Klik untuk mengubah status Master Anti-Cheat"
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                settings.antiCheatEnabled !== false ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 3 Detail Proteksi Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Blokir F12 */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-500" />
                <span>Blokir F12 / DevTools</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Mencegah buka inspect element, Ctrl+Shift+I, dan konsol peramban
              </p>
            </div>
            <input
              type="checkbox"
              id="chk-block-devtools"
              checked={settings.antiCheatBlockDevTools !== false}
              onChange={(e) => handleToggleSecuritySetting('antiCheatBlockDevTools', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Blokir Klik Kanan */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                <span>Blokir Menu Klik Kanan</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Mencegah menu konteks klik kanan dan long-press pada layar sentuh
              </p>
            </div>
            <input
              type="checkbox"
              id="chk-block-rightclick"
              checked={settings.antiCheatBlockRightClick !== false}
              onChange={(e) => handleToggleSecuritySetting('antiCheatBlockRightClick', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Blokir Copy Paste */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                <span>Proteksi Salin Teks</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Melindungi teks antarmuka dan soal ujian dari penyalinan otomatis
              </p>
            </div>
            <input
              type="checkbox"
              id="chk-block-copypaste"
              checked={settings.antiCheatBlockCopyPaste !== false}
              onChange={(e) => handleToggleSecuritySetting('antiCheatBlockCopyPaste', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* CARD 2: PENGATURAN POP-UP PERINGATAN TOAST */}
      <div className="bg-white dark:bg-slate-800 border-2 border-emerald-500/30 dark:border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${settings.antiCheatSecurityPopupsEnabled !== false ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                {settings.antiCheatSecurityPopupsEnabled !== false ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Pop-Up Peringatan Sistem Keamanan (Toast Alerts)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Menentukan apakah kotak toast peringatan muncul di layar saat terdeteksi aktivitas terlarang
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
              settings.antiCheatSecurityPopupsEnabled !== false
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}>
              {settings.antiCheatSecurityPopupsEnabled !== false ? '🟢 Pop-up Aktif' : '⚪ Mode Hening (Silent)'}
            </span>

            <button
              id="toggle-security-popups"
              type="button"
              onClick={() => {
                const nextVal = !(settings.antiCheatSecurityPopupsEnabled !== false);
                handleToggleSecuritySetting('antiCheatSecurityPopupsEnabled', nextVal);
                Swal.fire({
                  toast: true,
                  position: 'top-end',
                  icon: nextVal ? 'success' : 'info',
                  title: nextVal ? 'Pop-up Keamanan Diaktifkan' : 'Pop-up Keamanan Dimatikan (Mode Hening)',
                  text: nextVal
                    ? 'Kotak toast peringatan akan muncul jika terdeteksi aksi terlarang.'
                    : 'Proteksi tetap aktif di latar belakang tanpa memunculkan kotak peringatan.',
                  showConfirmButton: false,
                  timer: 2500
                });
              }}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.antiCheatSecurityPopupsEnabled !== false ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              role="switch"
              aria-checked={settings.antiCheatSecurityPopupsEnabled !== false}
              title="Klik untuk mengubah status Pop-up Keamanan"
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.antiCheatSecurityPopupsEnabled !== false ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs leading-relaxed text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Perbedaan Posisi ON dan Mode Hening (OFF):
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
              <li><strong>Posisi ON:</strong> Sistem menampilkan toast melayang gelap-amber saat terdeteksi klik kanan, tombol F12, atau pintasan inspect element.</li>
              <li><strong>Mode Hening (OFF):</strong> Tidak memunculkan notifikasi di layar agar antarmuka tetap bersih, namun peramban tetap menolak aksi terlarang di latar belakang.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CARD 3: TITIK KOORDINAT GPS & GEOFENCE LOKASI SEKOLAH */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Titik Koordinat & Geofence Lokasi Presensi Sekolah
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Patokan verifikasi koordinat GPS saat siswa melakukan absensi swafoto (selfie) mandiri
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDetectSchoolLocation}
            disabled={isDetectingLocation}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-center"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
            <span>{isDetectingLocation ? 'Membaca GPS...' : 'Kunci Lokasi Saya Saat Ini'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Latitude */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Latitude Sekolah:
            </label>
            <input
              type="number"
              step="any"
              value={settings.schoolLatitude ?? -6.2088}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                const updated = { ...settings, schoolLatitude: isNaN(val) ? 0 : val };
                setSettings(updated);
                onUpdateSettings(updated);
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="-6.208800"
            />
          </div>

          {/* Longitude */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Longitude Sekolah:
            </label>
            <input
              type="number"
              step="any"
              value={settings.schoolLongitude ?? 106.8456}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                const updated = { ...settings, schoolLongitude: isNaN(val) ? 0 : val };
                setSettings(updated);
                onUpdateSettings(updated);
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="106.845600"
            />
          </div>

          {/* Radius Meter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Radius Toleransi Presensi (Meter):
            </label>
            <input
              type="number"
              min="10"
              max="5000"
              value={settings.schoolRadiusMeters ?? 200}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                const updated = { ...settings, schoolRadiusMeters: isNaN(val) ? 200 : val };
                setSettings(updated);
                onUpdateSettings(updated);
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="200"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Cutoff Time */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Batas Jam Masuk (Terlambat):
            </label>
            <input
              type="time"
              value={settings.attendanceCutoffTime || '07:30'}
              onChange={(e) => {
                const updated = { ...settings, attendanceCutoffTime: e.target.value };
                setSettings(updated);
                onUpdateSettings(updated);
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Alamat Sekolah */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Alamat Resmi Sekolah:
            </label>
            <input
              type="text"
              value={settings.schoolAddress || ''}
              onChange={(e) => {
                const updated = { ...settings, schoolAddress: e.target.value };
                setSettings(updated);
                onUpdateSettings(updated);
              }}
              placeholder="Kompleks Pendidikan Utama No. 1, Jakarta"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
