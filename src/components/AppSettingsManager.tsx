import React, { useState, useEffect, useRef } from 'react';
import { DatabaseService } from '../services/databaseService';
import { AppSettings, RunningTextItem } from '../types';
import { AppLogo } from './AppLogo';
import { AntiCheatSecurityService } from '../services/antiCheatSecurityService';
import { PrintAndExportService } from '../services/printAndExportService';
import autoTable from 'jspdf-autotable';
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
  ShieldAlert,
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
  AlertCircle,
  Bell,
  BellOff,
  Lock,
  MapPin,
  SlidersHorizontal,
  Navigation,
  Crosshair,
  FileText,
  Printer,
  Download,
  QrCode,
  FileSpreadsheet,
  Layers,
  Stamp,
  Info,
  Eye,
  GripVertical,
  Move,
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

export type AppSettingsSubTab = 'general' | 'logo' | 'running_text' | 'security' | 'kop_signature';

export interface AppSettingsManagerProps {
  onSettingsSaved?: (newSettings: AppSettings) => void;
  initialTab?: AppSettingsSubTab;
  currentMainTab?: 'app_settings' | 'running_text' | 'kop_settings' | string;
  onNavigateTab?: (mainTab: string, subTab?: AppSettingsSubTab) => void;
  tabResetKey?: number | string;
}

export const AppSettingsManager: React.FC<AppSettingsManagerProps> = ({
  onSettingsSaved,
  initialTab,
  currentMainTab,
  onNavigateTab,
  tabResetKey
}) => {
  const dbService = DatabaseService.getInstance();
  const [settings, setSettings] = useState<AppSettings>(dbService.getAppSettings());
  const [isSaving, setIsSaving] = useState(false);

  // Drag and Drop Signature Position State
  const [draggedSigner, setDraggedSigner] = useState<'left_signer' | 'right_signer' | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<'kiri' | 'tengah' | 'kanan' | null>(null);

  // Tentukan sub-tab awal yang intuitif berdasarkan currentMainTab (identitas_logo vs running_text vs kop_settings)
  const getResolvedSubTab = (): AppSettingsSubTab => {
    if (currentMainTab === 'running_text') return 'running_text';
    if (currentMainTab === 'kop_settings') return 'kop_signature';
    if (currentMainTab === 'app_settings') {
      if (initialTab && initialTab !== 'running_text' && initialTab !== 'kop_signature') return initialTab;
      return 'general';
    }
    return initialTab || 'general';
  };

  const [activeTab, setActiveTab] = useState<AppSettingsSubTab>(getResolvedSubTab);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving'>('synced');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sinkronisasi otomatis saat berpindah dari sidebar utama atau drawer
  useEffect(() => {
    if (currentMainTab === 'running_text') {
      setActiveTab('running_text');
    } else if (currentMainTab === 'kop_settings') {
      setActiveTab('kop_signature');
    } else if (currentMainTab === 'app_settings') {
      setActiveTab(initialTab && initialTab !== 'running_text' ? initialTab : 'general');
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [currentMainTab, initialTab, tabResetKey]);

  // Handler pergantian tab yang secara cerdas dan intuitif menyinkronkan highlight menu sidebar
  const handleTabClick = (tab: AppSettingsSubTab) => {
    setActiveTab(tab);
    if (tab === 'running_text') {
      onNavigateTab?.('running_text', 'running_text');
    } else if (tab === 'kop_signature') {
      onNavigateTab?.('kop_settings', 'kop_signature');
    } else {
      onNavigateTab?.('app_settings', tab);
    }
  };

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

  const handleKopLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Format Berkas Tidak Sesuai',
        text: 'Silakan pilih berkas gambar logo (PNG, JPG, JPEG, SVG, WEBP).'
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Ukuran Terlalu Besar',
        text: 'Ukuran berkas logo maksimal 2 MB agar dokumen PDF cepat terbit.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSettings((prev) => ({
        ...prev,
        kopLogoUrl: base64
      }));
      Swal.fire({
        icon: 'success',
        title: 'Logo Kop Surat Terpasang',
        text: 'Logo berhasil dimasukkan dan akan otomatis tercetak di Kop Surat dokumen.',
        timer: 1500,
        showConfirmButton: false
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'left' | 'right') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Format Berkas Tidak Sesuai',
        text: 'Silakan pilih berkas gambar tanda tangan (PNG transparan disarankan, atau JPG).'
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Ukuran Terlalu Besar',
        text: 'Ukuran berkas tanda tangan maksimal 2 MB.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (side === 'left') {
        setSettings((prev) => ({
          ...prev,
          signatureLeftImageUrl: base64
        }));
      } else {
        setSettings((prev) => ({
          ...prev,
          signatureRightImageUrl: base64
        }));
      }
      Swal.fire({
        icon: 'success',
        title: 'Tanda Tangan Digital Terpasang',
        text: `Tanda tangan digital ${side === 'left' ? 'Pihak Pertama (Wali Kelas/Petugas)' : 'Pihak Kedua (Kepala Sekolah)'} berhasil diunggah.`,
        timer: 1500,
        showConfirmButton: false
      });
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
        title:
          activeTab === 'running_text'
            ? 'Running Text Berhasil Disimpan'
            : activeTab === 'kop_signature'
            ? 'Format Kertas, Kop & Tanda Tangan Disimpan'
            : 'Pengaturan Berhasil Disimpan',
        text:
          activeTab === 'running_text'
            ? 'Daftar pesan dan konfigurasi running text login telah diperbarui dan langsung aktif di halaman login.'
            : activeTab === 'kop_signature'
            ? 'Format ukuran kertas cetak, kop surat resmi, dan blok tanda tangan dokumen berhasil diperbarui.'
            : 'Identitas nama aplikasi, keterangan, dan logo telah diperbarui secara langsung di seluruh sistem.',
        timer: 1600,
        showConfirmButton: false
      });
    }, 200);
  };

  const handleDownloadSamplePDF = async () => {
    try {
      const printService = PrintAndExportService.getInstance();
      const doc = printService.initPDF(settings, settings.paperOrientation || 'portrait');
      const paper = printService.getPaperFormat(settings, settings.paperOrientation || 'portrait');

      const startY = printService.renderKopSurat(
        doc,
        settings,
        'CONTOH LEMBAR CETAK DOKUMEN RESMI SEKOLAH',
        'Verifikasi Format Ukuran Kertas, Tata Letak Kop Kedinasan & Keabsahan Tanda Tangan'
      );

      const sampleData = [
        ['1', '1001', 'Ahmad Fauzi Ridwan', 'X-MIPA-1', 'Hadir', '92 (A)', 'Tuntas'],
        ['2', '1002', 'Bunga Citra Lestari', 'X-MIPA-1', 'Hadir', '88 (B)', 'Tuntas'],
        ['3', '1003', 'Dimas Arya Pratama', 'X-MIPA-1', 'Izin', '85 (B)', 'Tuntas'],
        ['4', '1004', 'Eka Putri Nabila', 'X-MIPA-1', 'Hadir', '95 (A)', 'Tuntas'],
        ['5', '1005', 'Fajar Ramadhan Putra', 'X-MIPA-1', 'Sakit', '78 (C)', 'Tuntas']
      ];

      autoTable(doc, {
        head: [['No', 'NIS', 'Nama Siswa', 'Kelas', 'Kehadiran', 'Nilai Akhir', 'Keterangan']],
        body: sampleData,
        startY: startY + 3,
        theme: 'grid',
        margin: { left: paper.marginLeft, right: paper.marginRight },
        tableWidth: 'auto',
        headStyles: {
          fillColor: [30, 41, 59], // Slate-800 high contrast
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: 8.5,
          cellPadding: 2.8,
          lineWidth: 0.2,
          lineColor: [51, 65, 85]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
          textColor: [30, 41, 59],
          valign: 'middle'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 20 },
          2: { halign: 'left', fontStyle: 'bold' },
          3: { halign: 'center', cellWidth: 24 },
          4: { halign: 'center', cellWidth: 24 },
          5: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
          6: { halign: 'center', cellWidth: 24 }
        }
      });

      const finalTableY = ((doc as any).lastAutoTable?.finalY || startY + 50) + 4;
      await printService.renderTandaTangan(doc, settings, finalTableY);
      printService.renderFooterAndPageNumbers(doc, settings);

      const fileName = `SIMAK_Uji_Cetak_Kop_${settings.paperSize || 'A4'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      printService.savePDFDocument(doc, fileName);

      Swal.fire({
        icon: 'success',
        title: 'Uji Cetak PDF Berhasil!',
        text: `Berkas "${fileName}" berhasil diunduh. Silakan buka berkas untuk melihat hasil format Kop & Tanda Tangan.`,
        timer: 2400,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Test Print Error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Membuat Sampel PDF',
        text: err?.message || 'Terjadi kesalahan saat merender PDF.'
      });
    }
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

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const handleDetectSchoolLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire({
        icon: 'error',
        title: 'Tidak Didukung',
        text: 'Perangkat atau browser tidak mendukung fitur Geolocation GPS.'
      });
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingLocation(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const updated: AppSettings = {
          ...settings,
          schoolLatitude: lat,
          schoolLongitude: lng
        };
        setSettings(updated);
        queueAutoSave(updated);
        Swal.fire({
          icon: 'success',
          title: 'Titik Lokasi Terkunci',
          text: `Latitude: ${lat}, Longitude: ${lng} berhasil disimpan sebagai koordinat sekolah.`,
          timer: 2200,
          showConfirmButton: false
        });
      },
      (err) => {
        setIsDetectingLocation(false);
        Swal.fire({
          icon: 'warning',
          title: 'Gagal Membaca Lokasi',
          text: 'Pastikan izin lokasi pada peramban telah diizinkan. ' + (err.message || '')
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleToggleSecuritySetting = (key: keyof AppSettings, value: boolean) => {
    const updated: AppSettings = {
      ...settings,
      [key]: value
    };
    setSettings(updated);
    dbService.updateAppSettings({ [key]: value });
    if (onSettingsSaved) onSettingsSaved(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Dinamis Menyesuaikan Tab Aktif & Menu Sidebar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xs ${
            activeTab === 'running_text'
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
              : activeTab === 'security'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
              : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
          }`}>
            {activeTab === 'running_text' ? (
              <Megaphone className="w-6 h-6" />
            ) : activeTab === 'security' ? (
              <ShieldCheck className="w-6 h-6" />
            ) : activeTab === 'logo' ? (
              <ImageIcon className="w-6 h-6" />
            ) : (
              <Settings className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {activeTab === 'running_text'
                  ? 'Pengaturan Running Text Halaman Login'
                  : activeTab === 'security'
                  ? 'Pengaturan Keamanan & Anti-Cheat'
                  : activeTab === 'logo'
                  ? 'Pengaturan Logo & Visual Sekolah'
                  : 'Pengaturan Identitas & Keterangan Aplikasi'}
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                activeTab === 'running_text'
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
              }`}>
                {activeTab === 'running_text' ? 'Menu Sidebar: Running Text' : 'Menu Sidebar: Identitas & Logo'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
              {activeTab === 'running_text'
                ? 'Kelola teks berjalan, kecepatan animasi, pesan pengumuman, dan salam waktu di layar login'
                : activeTab === 'security'
                ? 'Konfigurasi proteksi DevTools, anti-inspeksi, pembatasan klik kanan, dan notifikasi peringatan'
                : activeTab === 'logo'
                ? 'Kelola ikon visual preset, logo kustom sekolah, dan palet warna tema instansi'
                : 'Kelola nama sekolah, deskripsi keterangan, dan identitas resmi kop surat'}
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
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
              activeTab === 'running_text'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isSaving
                ? 'Menyimpan...'
                : activeTab === 'running_text'
                ? 'Simpan Running Text'
                : 'Simpan Pengaturan'}
            </span>
          </button>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-amber-300">
            <Sparkle className="w-3.5 h-3.5" />
            {activeTab === 'running_text'
              ? 'Pratinjau Langsung Running Text Halaman Masuk'
              : 'Pratinjau Langsung (Live Preview Header & Brand)'}
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

      {/* Form Tabs Bar dengan Desain Bersih, Proporsional & Tanpa Label Ganda */}
      <div className="p-1.5 bg-slate-100/90 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {/* TAB 1: NAMA & KETERANGAN */}
        <button
          id="tab-nama-keterangan"
          type="button"
          onClick={() => handleTabClick('general')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer border ${
            activeTab === 'general'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>Nama & Keterangan</span>
        </button>

        {/* TAB 2: PENGATURAN LOGO */}
        <button
          id="tab-pengaturan-logo"
          type="button"
          onClick={() => handleTabClick('logo')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer border ${
            activeTab === 'logo'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Pengaturan Logo</span>
        </button>

        {/* TAB 3: RUNNING TEXT (PENGUMUMAN HALAMAN LOGIN) */}
        <button
          id="tab-edit-running-text"
          type="button"
          onClick={() => handleTabClick('running_text')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer border ${
            activeTab === 'running_text'
              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
              : 'border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300'
          }`}
        >
          <Megaphone className={`w-4 h-4 ${activeTab === 'running_text' ? 'text-white' : 'text-black dark:text-white'}`} />
          <span>Edit Running Text Login</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'running_text'
              ? 'bg-white/20 text-white'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
          }`}>
            {runningTextItemsList.filter(i => i.isActive).length} Aktif
          </span>
        </button>

        {/* TAB 4: KERTAS, KOP & TANDA TANGAN */}
        <button
          id="tab-kertas-kop-signature"
          type="button"
          onClick={() => handleTabClick('kop_signature')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer border ${
            activeTab === 'kop_signature'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Kertas, Kop & Tanda Tangan</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'kop_signature'
              ? 'bg-white/20 text-white'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
          }`}>
            {settings.paperSize || 'A4'}
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

      {/* TAB CONTENT: Kertas, Kop & Tanda Tangan Dokumen */}
      {activeTab === 'kop_signature' && (
        <div className="space-y-6">
          {/* Top Banner Header & Quick Test Print Button */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Format Kertas, Kop Kedinasan & Tanda Tangan Resmi
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                    Standar Cetak PDF Resmi
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  Konfigurasikan ukuran lembar kertas, kop surat dinas pendidikan, penomoran halaman otomatis, dan tanda tangan digital ber-QR code untuk seluruh laporan cetak rapor dan master data aplikasi.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
              <button
                type="button"
                id="btn-test-print-kop"
                onClick={handleDownloadSamplePDF}
                className="px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
                title="Unduh contoh lembar PDF untuk mengecek hasil cetak printer"
              >
                <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Unduh Sampel PDF (Tes Cetak)</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Dokumen'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Settings Columns (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* BAGIAN 1: PENGATURAN KERTAS & MARGIN */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    1. Pengaturan Kertas & Lembar Cetak
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Ukuran Kertas */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                      Ukuran Kertas Standar:
                    </label>
                    <select
                      id="select-paper-size"
                      value={settings.paperSize || 'a4'}
                      onChange={(e) => setSettings({ ...settings, paperSize: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="a4">A4 (210 x 297 mm) — Standar Nasional & Rapor</option>
                      <option value="f4">F4 / Folio (215 x 330 mm) — Administrasi Sekolah</option>
                      <option value="letter">Letter (216 x 279 mm) — Standar Internasional</option>
                      <option value="legal">Legal (216 x 356 mm) — Berkas Panjang</option>
                    </select>
                  </div>

                  {/* Orientasi Standar */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                      Orientasi Halaman Default:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, paperOrientation: 'portrait' })}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          (settings.paperOrientation || 'portrait') === 'portrait'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>Potret (Vertikal)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, paperOrientation: 'landscape' })}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          settings.paperOrientation === 'landscape'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>Lanskap (Horisontal)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Margin Dokumen (mm) */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                    Batas Margin Dokumen (Milimeter):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Atas (mm)</span>
                      <input
                        type="number"
                        min="5"
                        max="40"
                        value={settings.paperMarginTop ?? 15}
                        onChange={(e) => setSettings({ ...settings, paperMarginTop: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Bawah (mm)</span>
                      <input
                        type="number"
                        min="5"
                        max="40"
                        value={settings.paperMarginBottom ?? 15}
                        onChange={(e) => setSettings({ ...settings, paperMarginBottom: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Kiri (mm)</span>
                      <input
                        type="number"
                        min="5"
                        max="40"
                        value={settings.paperMarginLeft ?? 15}
                        onChange={(e) => setSettings({ ...settings, paperMarginLeft: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Kanan (mm)</span>
                      <input
                        type="number"
                        min="5"
                        max="40"
                        value={settings.paperMarginRight ?? 15}
                        onChange={(e) => setSettings({ ...settings, paperMarginRight: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Penomoran Halaman Toggle */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Penomoran Halaman Otomatis
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Menampilkan &quot;Halaman X dari Y&quot; serta nama sistem pada kaki lembar (footer).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.paperPageNumbering !== false}
                    onChange={(e) => setSettings({ ...settings, paperPageNumbering: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* BAGIAN 2: PENGATURAN KOP SURAT RESMI */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      2. Pengaturan Kop Surat Kedinasan
                    </h4>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Gunakan Kop Surat:
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.kopEnabled !== false}
                      onChange={(e) => setSettings({ ...settings, kopEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                  </label>
                </div>

                {settings.kopEnabled !== false && (
                  <div className="space-y-4">
                    {/* INSERT & ATUR LOGO KOP SURAT */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Logo & Lambang Kop Surat
                          </label>
                        </div>
                        {settings.kopLogoUrl && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Logo Kustom Aktif
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* Preview Box */}
                        <div className="w-16 h-16 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center p-2 shrink-0 shadow-2xs overflow-hidden">
                          {settings.kopLogoUrl || (settings.logoType === 'image' && settings.logoImageUrl) ? (
                            <img
                              src={settings.kopLogoUrl || settings.logoImageUrl}
                              alt="Logo Kop"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-[9px] shadow-xs">
                              SIMAK
                            </div>
                          )}
                        </div>

                        {/* Action Buttons & Input */}
                        <div className="flex-1 space-y-2 w-full">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Unggah Logo (PNG/JPG/SVG)</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleKopLogoUpload}
                                className="hidden"
                              />
                            </label>

                            {settings.logoType === 'image' && settings.logoImageUrl && settings.kopLogoUrl !== settings.logoImageUrl && (
                              <button
                                type="button"
                                onClick={() => setSettings({ ...settings, kopLogoUrl: settings.logoImageUrl })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-600 transition cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                <span>Gunakan Logo Aplikasi</span>
                              </button>
                            )}

                            {settings.kopLogoUrl && (
                              <button
                                type="button"
                                onClick={() => setSettings({ ...settings, kopLogoUrl: undefined })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Reset ke Default</span>
                              </button>
                            )}
                          </div>

                          <div className="space-y-1">
                            <input
                              type="text"
                              value={settings.kopLogoUrl || ''}
                              onChange={(e) => setSettings({ ...settings, kopLogoUrl: e.target.value })}
                              placeholder="Atau tempelkan URL logo langsung (https://... / data:image/...)"
                              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Posisi Logo di Kop */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Penempatan Posisi Logo Sekolah di Kop:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'left', label: 'Sisi Kiri (Standar Kedinasan)' },
                            { id: 'both', label: 'Dua Sisi (Kiri & Kanan)' },
                            { id: 'center', label: 'Tengah di Atas Teks' }
                          ].map((pos) => (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => setSettings({ ...settings, kopLogoPosition: pos.id as any })}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                                (settings.kopLogoPosition || 'left') === pos.id
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Real-time Logo & Header Interactive Inspection Preview */}
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                            <Eye className="w-3.5 h-3.5" />
                            Pratinjau Real-Time Posisi Logo Kop Surat
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Skala Cetak: 20×20 mm
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/90 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                          <div className={`flex items-center gap-3 ${
                            (settings.kopLogoPosition || 'left') === 'center'
                              ? 'flex-col text-center'
                              : (settings.kopLogoPosition || 'left') === 'both'
                              ? 'justify-between'
                              : 'justify-start'
                          }`}>
                            {/* Logo Kiri / Tengah */}
                            <div className="w-10 h-10 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center p-1 shrink-0 shadow-2xs">
                              {settings.kopLogoUrl || (settings.logoType === 'image' && settings.logoImageUrl) ? (
                                <img
                                  src={settings.kopLogoUrl || settings.logoImageUrl}
                                  alt="Logo Kop"
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-[7.5px]">
                                  SIMAK
                                </div>
                              )}
                            </div>

                            {/* Teks Kop Tengah */}
                            <div className={`flex-1 min-w-0 ${
                              (settings.kopLogoPosition || 'left') === 'center' ? 'text-center' : 'text-center'
                            }`}>
                              <p className="text-[8px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight truncate">
                                {settings.kopInstansiUtama || 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA'}
                              </p>
                              <p className="text-[8.5px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate">
                                {settings.kopDinas || 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
                              </p>
                              <p className="text-[10.5px] font-black text-slate-900 dark:text-white uppercase truncate">
                                {settings.kopNamaSekolah || settings.appName || 'SMA NEGERI UNGGULAN INDONESIA'}
                              </p>
                              <p className="text-[7.5px] text-slate-500 truncate">
                                {settings.kopAlamat || 'Jl. Pendidikan No. 45, Jakarta'} • {settings.kopKodePos || '12345'}
                              </p>
                            </div>

                            {/* Logo Kanan jika mode 'both' */}
                            {(settings.kopLogoPosition || 'left') === 'both' && (
                              <div className="w-10 h-10 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center p-1 shrink-0 shadow-2xs">
                                {settings.kopLogoUrl || (settings.logoType === 'image' && settings.logoImageUrl) ? (
                                  <img
                                    src={settings.kopLogoUrl || settings.logoImageUrl}
                                    alt="Logo Kop Kanan"
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-[7.5px]">
                                    SIMAK
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Border indicator */}
                          <div className="mt-2 border-t-2 border-slate-800 dark:border-slate-200 pt-0.5">
                            <div className="border-t border-slate-400"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Instansi Induk */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Pemerintah Daerah / Instansi Induk (Baris 1):
                      </label>
                      <input
                        type="text"
                        value={settings.kopInstansiUtama || ''}
                        onChange={(e) => setSettings({ ...settings, kopInstansiUtama: e.target.value })}
                        placeholder="Contoh: PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Dinas */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Dinas Pendidikan / Terkait (Baris 2):
                      </label>
                      <input
                        type="text"
                        value={settings.kopDinas || ''}
                        onChange={(e) => setSettings({ ...settings, kopDinas: e.target.value })}
                        placeholder="Contoh: DINAS PENDIDIKAN DAN KEBUDAYAAN"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Nama Sekolah */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Nama Satuan Pendidikan / Sekolah (Baris 3 - Judul Besar):
                      </label>
                      <input
                        type="text"
                        value={settings.kopNamaSekolah || ''}
                        onChange={(e) => setSettings({ ...settings, kopNamaSekolah: e.target.value })}
                        placeholder="Contoh: SMA NEGERI UNGGULAN INDONESIA"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Sub Heading */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Akreditasi / Slogan Sub-Judul (Baris 4):
                      </label>
                      <input
                        type="text"
                        value={settings.kopSubHeading || ''}
                        onChange={(e) => setSettings({ ...settings, kopSubHeading: e.target.value })}
                        placeholder="Contoh: SEKOLAH PENGGERAK • STATUS AKREDITASI A (UNGGUL)"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Alamat & Kontak */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Alamat Lengkap Sekolah:
                        </label>
                        <input
                          type="text"
                          value={settings.kopAlamat || ''}
                          onChange={(e) => setSettings({ ...settings, kopAlamat: e.target.value })}
                          placeholder="Jl. Pendidikan No. 45, Kebayoran Baru, Jakarta"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Kode Pos:
                        </label>
                        <input
                          type="text"
                          value={settings.kopKodePos || ''}
                          onChange={(e) => setSettings({ ...settings, kopKodePos: e.target.value })}
                          placeholder="Kode Pos: 12345"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Kontak & Website:
                      </label>
                      <input
                        type="text"
                        value={settings.kopKontak || ''}
                        onChange={(e) => setSettings({ ...settings, kopKontak: e.target.value })}
                        placeholder="Telp: (021) 7890123 • Email: info@sekolah.sch.id • Web: www.sekolah.sch.id"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Garis Pembatas Kop */}
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Gaya Garis Pembatas Kop:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'double', label: 'Garis Ganda Kedinasan' },
                          { id: 'single', label: 'Garis Tunggal' },
                          { id: 'none', label: 'Tanpa Garis' }
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSettings({ ...settings, kopBorderType: b.id as any })}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                              (settings.kopBorderType || 'double') === b.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* BAGIAN 3: PENGATURAN TANDA TANGAN & LEGALISASI */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Stamp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      3. Pengesahan & Tanda Tangan Dokumen
                    </h4>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Sertakan Blok Tanda Tangan:
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.signatureEnabled !== false}
                      onChange={(e) => setSettings({ ...settings, signatureEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                  </label>
                </div>

                {settings.signatureEnabled !== false && (
                  <div className="space-y-4">
                    {/* Kota & Tanggal */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Kota / Tempat Penerbitan Dokumen:
                        </label>
                        <input
                          type="text"
                          value={settings.signatureKota || ''}
                          onChange={(e) => setSettings({ ...settings, signatureKota: e.target.value })}
                          placeholder="Contoh: Jakarta"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Mode Tanggal Dokumen:
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                          <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name="tanggal_mode"
                              checked={settings.signatureTanggalOtomatis !== false}
                              onChange={() => setSettings({ ...settings, signatureTanggalOtomatis: true })}
                              className="text-blue-600 cursor-pointer"
                            />
                            <span>Otomatis Waktu Sistem</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name="tanggal_mode"
                              checked={settings.signatureTanggalOtomatis === false}
                              onChange={() => setSettings({ ...settings, signatureTanggalOtomatis: false })}
                              className="text-blue-600 cursor-pointer"
                            />
                            <span>Teks Manual</span>
                          </label>
                        </div>
                        {settings.signatureTanggalOtomatis === false && (
                          <input
                            type="text"
                            value={settings.signatureTanggalManual || ''}
                            onChange={(e) => setSettings({ ...settings, signatureTanggalManual: e.target.value })}
                            placeholder="Contoh: 24 Juni 2025"
                            className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                          />
                        )}
                      </div>
                    </div>

                    {/* Penandatangan Kiri & Kanan */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">
                            Tata Letak & Posisi Tanda Tangan (Drag & Drop):
                          </label>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Tentukan posisi kolom tanda tangan atau tarik kartu langsung di lembar pratinjau di samping kanan.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const next: AppSettings = {
                                ...settings,
                                signaturePosKiri: 'left_signer',
                                signaturePosTengah: 'empty',
                                signaturePosKanan: 'right_signer'
                              };
                              setSettings(next);
                              queueAutoSave(next);
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                          >
                            Standar (Kiri & Kanan)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next: AppSettings = {
                                ...settings,
                                signaturePosKiri: 'empty',
                                signaturePosTengah: 'right_signer',
                                signaturePosKanan: 'empty'
                              };
                              setSettings(next);
                              queueAutoSave(next);
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                          >
                            Tengah Tunggal
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next: AppSettings = {
                                ...settings,
                                signaturePosKiri: 'empty',
                                signaturePosTengah: 'empty',
                                signaturePosKanan: 'right_signer'
                              };
                              setSettings(next);
                              queueAutoSave(next);
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                          >
                            Kanan Tunggal
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const curKiri = settings.signaturePosKiri || 'left_signer';
                              const curTengah = settings.signaturePosTengah || 'empty';
                              const curKanan = settings.signaturePosKanan || 'right_signer';
                              const next: AppSettings = {
                                ...settings,
                                signaturePosKiri: curKanan,
                                signaturePosTengah: curTengah,
                                signaturePosKanan: curKiri
                              };
                              setSettings(next);
                              queueAutoSave(next);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 transition cursor-pointer border border-blue-200 dark:border-blue-800"
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            Tukar Posisi
                          </button>
                        </div>
                      </div>

                      {/* Visual 3 Slots Map */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        {/* Slot Kiri */}
                        <div className="text-center p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            Slot Kiri
                          </span>
                          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {(settings.signaturePosKiri || 'left_signer') === 'left_signer'
                              ? 'Pihak Pertama (Wali Kelas)'
                              : (settings.signaturePosKiri || 'left_signer') === 'right_signer'
                              ? 'Pihak Kedua (Kepala Sekolah)'
                              : '(Kosong)'}
                          </span>
                        </div>

                        {/* Slot Tengah */}
                        <div className="text-center p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            Slot Tengah
                          </span>
                          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {(settings.signaturePosTengah || 'empty') === 'left_signer'
                              ? 'Pihak Pertama (Wali Kelas)'
                              : (settings.signaturePosTengah || 'empty') === 'right_signer'
                              ? 'Pihak Kedua (Kepala Sekolah)'
                              : '(Kosong)'}
                          </span>
                        </div>

                        {/* Slot Kanan */}
                        <div className="text-center p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            Slot Kanan
                          </span>
                          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {(settings.signaturePosKanan || 'right_signer') === 'left_signer'
                              ? 'Pihak Pertama (Wali Kelas)'
                              : (settings.signaturePosKanan || 'right_signer') === 'right_signer'
                              ? 'Pihak Kedua (Kepala Sekolah)'
                              : '(Kosong)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {/* Kolom Kiri: Wali Kelas / Petugas Administrasi */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                            Pihak Pertama:
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            Posisi:{' '}
                            {(settings.signaturePosKiri || 'left_signer') === 'left_signer'
                              ? 'Kiri'
                              : (settings.signaturePosTengah || 'empty') === 'left_signer'
                              ? 'Tengah'
                              : (settings.signaturePosKanan || 'right_signer') === 'left_signer'
                              ? 'Kanan'
                              : 'Nonaktif'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            Jabatan Penandatangan:
                          </label>
                          <input
                            type="text"
                            value={settings.signatureJabatanKiri || ''}
                            onChange={(e) => setSettings({ ...settings, signatureJabatanKiri: e.target.value })}
                            placeholder="Wali Kelas / Petugas Administrasi"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            Nama Lengkap & Gelar:
                          </label>
                          <input
                            type="text"
                            value={settings.signatureNamaKiri || ''}
                            onChange={(e) => setSettings({ ...settings, signatureNamaKiri: e.target.value })}
                            placeholder="Dra. Hj. Siti Rahmawati, M.Pd"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            NIP / NUPTK:
                          </label>
                          <input
                            type="text"
                            value={settings.signatureNipKiri || ''}
                            onChange={(e) => setSettings({ ...settings, signatureNipKiri: e.target.value })}
                            placeholder="NIP. 19780512 200312 2 001"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                          />
                        </div>

                        {/* Upload Tanda Tangan Digital Pihak Pertama */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            Unggah Tanda Tangan Digital (Pihak Pertama):
                          </label>
                          <div className="flex items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Unggah Gambar TTD</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleSignatureUpload(e, 'left')}
                                className="hidden"
                              />
                            </label>
                            {settings.signatureLeftImageUrl && (
                              <button
                                type="button"
                                onClick={() => setSettings({ ...settings, signatureLeftImageUrl: undefined })}
                                className="px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                          {settings.signatureLeftImageUrl && (
                            <div className="h-12 w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-1 flex items-center justify-center overflow-hidden shadow-2xs">
                              <img
                                src={settings.signatureLeftImageUrl}
                                alt="TTD Kiri"
                                className="h-full object-contain"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Kolom Kanan: Kepala Sekolah / Pimpinan */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                            Pihak Kedua / Pengesahan:
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            Posisi:{' '}
                            {(settings.signaturePosKiri || 'left_signer') === 'right_signer'
                              ? 'Kiri'
                              : (settings.signaturePosTengah || 'empty') === 'right_signer'
                              ? 'Tengah'
                              : (settings.signaturePosKanan || 'right_signer') === 'right_signer'
                              ? 'Kanan'
                              : 'Nonaktif'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            Jabatan Pimpinan:
                          </label>
                          <input
                            type="text"
                            value={settings.signatureJabatanKanan || ''}
                            onChange={(e) => setSettings({ ...settings, signatureJabatanKanan: e.target.value })}
                            placeholder="Kepala Sekolah"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            Nama Lengkap & Gelar:
                          </label>
                          <input
                            type="text"
                            value={settings.signatureNamaKanan || ''}
                            onChange={(e) => setSettings({ ...settings, signatureNamaKanan: e.target.value })}
                            placeholder="Dr. H. Bambang Sudarsono, M.Si"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            NIP / NUPTK:
                          </label>
                          <input
                            type="text"
                            value={settings.signatureNipKanan || ''}
                            onChange={(e) => setSettings({ ...settings, signatureNipKanan: e.target.value })}
                            placeholder="NIP. 19690415 199403 1 004"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                          />
                        </div>

                        {/* Upload Tanda Tangan Digital Pihak Kedua */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            Unggah Tanda Tangan Digital (Pihak Kedua):
                          </label>
                          <div className="flex items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Unggah Gambar TTD</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleSignatureUpload(e, 'right')}
                                className="hidden"
                              />
                            </label>
                            {settings.signatureRightImageUrl && (
                              <button
                                type="button"
                                onClick={() => setSettings({ ...settings, signatureRightImageUrl: undefined })}
                                className="px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                          {settings.signatureRightImageUrl && (
                            <div className="h-12 w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-1 flex items-center justify-center overflow-hidden shadow-2xs">
                              <img
                                src={settings.signatureRightImageUrl}
                                alt="TTD Kanan"
                                className="h-full object-contain"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* QR Code Validation */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-blue-600" />
                          Sertakan QR Code Verifikasi Keaslian Dokumen Digital
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Membuat kode QR verifikasi keabsahan dokumen resmi di samping tanda tangan kepala sekolah.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.signatureQrVerification !== false}
                        onChange={(e) => setSettings({ ...settings, signatureQrVerification: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Interactive Document Sheet Mockup (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="sticky top-20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Pratinjau Lembar Dokumen
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {(settings.paperSize || 'a4').toUpperCase()} • {(settings.paperOrientation || 'portrait') === 'portrait' ? 'Potret' : 'Lanskap'}
                  </span>
                </div>

                {/* White Realistic Paper Canvas */}
                <div className="bg-white text-slate-900 rounded-xl p-5 border border-slate-300 shadow-xl space-y-4 font-sans select-none overflow-hidden text-xs">
                  {/* Kop Surat Mockup */}
                  {settings.kopEnabled !== false ? (
                    <div className="space-y-2 border-b-2 border-slate-900 pb-2">
                      <div className={`flex items-center gap-2.5 ${
                        (settings.kopLogoPosition || 'left') === 'center'
                          ? 'flex-col text-center'
                          : (settings.kopLogoPosition || 'left') === 'both'
                          ? 'justify-between'
                          : 'justify-start'
                      }`}>
                        {/* Logo Kiri / Tengah */}
                        {settings.kopLogoUrl || (settings.logoType === 'image' && settings.logoImageUrl) ? (
                          <img
                            src={settings.kopLogoUrl || settings.logoImageUrl}
                            alt="Logo Kop"
                            className="w-10 h-10 object-contain shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[9px] shrink-0 shadow-2xs">
                            SIMAK
                          </div>
                        )}

                        {/* Teks Kop */}
                        <div className="text-center flex-1 space-y-0.5 min-w-0">
                          <p className="text-[8px] font-bold text-slate-700 uppercase tracking-tight leading-tight truncate">
                            {settings.kopInstansiUtama || 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA'}
                          </p>
                          <p className="text-[9px] font-bold text-slate-800 uppercase tracking-tight leading-tight truncate">
                            {settings.kopDinas || 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
                          </p>
                          <p className="text-[12px] font-black text-slate-900 uppercase tracking-normal leading-tight truncate">
                            {settings.kopNamaSekolah || settings.appName || 'SMA NEGERI UNGGULAN INDONESIA'}
                          </p>
                          <p className="text-[7.5px] text-slate-600 leading-tight truncate">
                            {settings.kopSubHeading || 'SEKOLAH PENGGERAK • STATUS AKREDITASI A (UNGGUL)'}
                          </p>
                          <p className="text-[7px] text-slate-500 leading-tight truncate">
                            {settings.kopAlamat || 'Jl. Pendidikan Nasional No. 45, Jakarta'} • {settings.kopKodePos || 'Kode Pos: 12345'}
                          </p>
                        </div>

                        {/* Logo Kanan jika mode 'both' */}
                        {(settings.kopLogoPosition || 'left') === 'both' && (
                          settings.kopLogoUrl || (settings.logoType === 'image' && settings.logoImageUrl) ? (
                            <img
                              src={settings.kopLogoUrl || settings.logoImageUrl}
                              alt="Logo Kop Kanan"
                              className="w-10 h-10 object-contain shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[9px] shrink-0 shadow-2xs">
                              SIMAK
                            </div>
                          )
                        )}
                      </div>

                      {/* Double border rule */}
                      {(settings.kopBorderType || 'double') === 'double' && (
                        <div className="border-t border-slate-900 mt-1 pt-0.5">
                          <div className="border-t border-slate-600"></div>
                        </div>
                      )}
                      {settings.kopBorderType === 'single' && (
                        <div className="border-t border-slate-900 mt-1"></div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-900 text-white p-2 rounded text-center font-bold text-[11px]">
                      {settings.appName.toUpperCase()}
                    </div>
                  )}

                  {/* Document Title */}
                  <div className="text-center space-y-0.5 py-1">
                    <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                      LAPORAN HASIL REKAPITULASI RESMI
                    </h5>
                    <p className="text-[8.5px] text-slate-500">
                      Tahun Ajaran 2024/2025 • Lembar Administrasi Terintegrasi
                    </p>
                  </div>

                  {/* Sample Data Table */}
                  <div className="border border-slate-300 rounded overflow-hidden">
                    <table className="w-full text-[8.5px] border-collapse">
                      <thead className="bg-slate-900 text-white font-bold">
                        <tr>
                          <th className="py-1 px-1.5 border-r border-slate-700 text-center w-6">No</th>
                          <th className="py-1 px-1.5 border-r border-slate-700 text-left">Nama Siswa</th>
                          <th className="py-1 px-1.5 border-r border-slate-700 text-center w-14">Kelas</th>
                          <th className="py-1 px-1.5 border-r border-slate-700 text-center w-14">Nilai</th>
                          <th className="py-1 px-1.5 text-center w-14">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-slate-50">
                          <td className="py-1 px-1.5 text-center font-semibold">1</td>
                          <td className="py-1 px-1.5 font-bold">Ahmad Fauzi Ridwan</td>
                          <td className="py-1 px-1.5 text-center">X-MIPA-1</td>
                          <td className="py-1 px-1.5 text-center font-bold text-slate-900">92 (A)</td>
                          <td className="py-1 px-1.5 text-center text-emerald-600 font-bold">Tuntas</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-1.5 text-center font-semibold">2</td>
                          <td className="py-1 px-1.5 font-bold">Bunga Citra Lestari</td>
                          <td className="py-1 px-1.5 text-center">X-MIPA-1</td>
                          <td className="py-1 px-1.5 text-center font-bold text-slate-900">88 (B)</td>
                          <td className="py-1 px-1.5 text-center text-emerald-600 font-bold">Tuntas</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="py-1 px-1.5 text-center font-semibold">3</td>
                          <td className="py-1 px-1.5 font-bold">Dimas Arya Pratama</td>
                          <td className="py-1 px-1.5 text-center">X-MIPA-1</td>
                          <td className="py-1 px-1.5 text-center font-bold text-slate-900">85 (B)</td>
                          <td className="py-1 px-1.5 text-center text-emerald-600 font-bold">Tuntas</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Signature Mockup - Interactive Drag and Drop Slots */}
                  {settings.signatureEnabled !== false && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-[8px] text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-blue-700">
                          <Move className="w-3 h-3" />
                          Drag & Drop Posisi Tanda Tangan:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const curKiri = settings.signaturePosKiri || 'left_signer';
                              const curTengah = settings.signaturePosTengah || 'empty';
                              const curKanan = settings.signaturePosKanan || 'right_signer';
                              const next: AppSettings = {
                                ...settings,
                                signaturePosKiri: curKanan,
                                signaturePosTengah: curTengah,
                                signaturePosKanan: curKiri
                              };
                              setSettings(next);
                              queueAutoSave(next);
                            }}
                            className="text-[7.5px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          >
                            Tukar Posisi
                          </button>
                        </div>
                      </div>

                      {/* 3-Column Interactive Drop Grid */}
                      <div className="grid grid-cols-3 gap-1.5 min-h-[110px]">
                        {(['kiri', 'tengah', 'kanan'] as const).map((slotKey) => {
                          const slotOccupant =
                            slotKey === 'kiri'
                              ? settings.signaturePosKiri || 'left_signer'
                              : slotKey === 'tengah'
                              ? settings.signaturePosTengah || 'empty'
                              : settings.signaturePosKanan || 'right_signer';

                          const isDragOver = dragOverSlot === slotKey;

                          const moveSigner = (signer: 'left_signer' | 'right_signer', target: 'kiri' | 'tengah' | 'kanan') => {
                            const curKiri = settings.signaturePosKiri || 'left_signer';
                            const curTengah = settings.signaturePosTengah || 'empty';
                            const curKanan = settings.signaturePosKanan || 'right_signer';

                            let curSlot: 'kiri' | 'tengah' | 'kanan' | null = null;
                            if (curKiri === signer) curSlot = 'kiri';
                            else if (curTengah === signer) curSlot = 'tengah';
                            else if (curKanan === signer) curSlot = 'kanan';

                            if (curSlot === target) return;

                            const targetOcc = target === 'kiri' ? curKiri : target === 'tengah' ? curTengah : curKanan;

                            let nextK = curKiri;
                            let nextT = curTengah;
                            let nextKn = curKanan;

                            if (target === 'kiri') nextK = signer;
                            else if (target === 'tengah') nextT = signer;
                            else if (target === 'kanan') nextKn = signer;

                            if (curSlot === 'kiri') nextK = targetOcc === signer ? 'empty' : targetOcc;
                            else if (curSlot === 'tengah') nextT = targetOcc === signer ? 'empty' : targetOcc;
                            else if (curSlot === 'kanan') nextKn = targetOcc === signer ? 'empty' : targetOcc;

                            const nextSettings: AppSettings = {
                              ...settings,
                              signaturePosKiri: nextK,
                              signaturePosTengah: nextT,
                              signaturePosKanan: nextKn
                            };
                            setSettings(nextSettings);
                            queueAutoSave(nextSettings);
                          };

                          return (
                            <div
                              key={slotKey}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverSlot(slotKey);
                              }}
                              onDragLeave={() => {
                                if (dragOverSlot === slotKey) setDragOverSlot(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                setDragOverSlot(null);
                                const signer = (e.dataTransfer.getData('text/plain') as any) || draggedSigner;
                                if (signer) {
                                  moveSigner(signer, slotKey);
                                }
                              }}
                              className={`rounded-lg border-2 p-1.5 transition-all flex flex-col justify-between ${
                                isDragOver
                                  ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-300'
                                  : slotOccupant !== 'empty'
                                  ? 'border-slate-300 bg-slate-50/50 hover:border-blue-300'
                                  : 'border-dashed border-slate-200 bg-slate-50/30 text-slate-400'
                              }`}
                            >
                              {/* Slot Tag */}
                              <div className="flex items-center justify-between text-[7px] text-slate-400 pb-1 border-b border-slate-200/60 mb-1">
                                <span className="font-bold uppercase">
                                  {slotKey === 'kiri' ? 'Posisi Kiri' : slotKey === 'tengah' ? 'Posisi Tengah' : 'Posisi Kanan'}
                                </span>
                                {slotOccupant !== 'empty' && (
                                  <span className="text-[6.5px] px-1 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">
                                    {slotOccupant === 'left_signer' ? 'Pihak 1' : 'Pihak 2'}
                                  </span>
                                )}
                              </div>

                              {/* Slot Content */}
                              {slotOccupant === 'left_signer' ? (
                                <div
                                  draggable={true}
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', 'left_signer');
                                    setDraggedSigner('left_signer');
                                  }}
                                  onDragEnd={() => {
                                    setDraggedSigner(null);
                                    setDragOverSlot(null);
                                  }}
                                  className="group cursor-grab active:cursor-grabbing select-none space-y-0.5 text-[8px]"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Mengetahui,</span>
                                    <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition" />
                                  </div>
                                  <p className="font-bold text-slate-800 truncate">
                                    {settings.signatureJabatanKiri || 'Wali Kelas / Petugas Administrasi'}
                                  </p>
                                  <div className="h-8 flex items-center justify-center my-0.5">
                                    {settings.signatureLeftImageUrl ? (
                                      <img
                                        src={settings.signatureLeftImageUrl}
                                        alt="TTD Kiri Digital"
                                        className="h-7 max-w-[70px] object-contain"
                                      />
                                    ) : (
                                      <span className="text-[7px] italic text-slate-400">(Tanda Tangan)</span>
                                    )}
                                  </div>
                                  <p className="font-bold text-slate-900 underline truncate">
                                    {settings.signatureNamaKiri || 'Dra. Hj. Siti Rahmawati, M.Pd'}
                                  </p>
                                  <p className="text-[7px] text-slate-600 truncate">
                                    {settings.signatureNipKiri || 'NIP. 19780512 200312 2 001'}
                                  </p>

                                  {/* Quick Slot Shift Buttons */}
                                  <div className="pt-1.5 flex items-center justify-center gap-1 border-t border-slate-200 mt-1">
                                    <button
                                      type="button"
                                      disabled={slotKey === 'kiri'}
                                      onClick={() => moveSigner('left_signer', 'kiri')}
                                      className={`px-1 py-0.5 text-[6.5px] font-bold rounded ${
                                        slotKey === 'kiri' ? 'bg-blue-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                      }`}
                                    >
                                      Kiri
                                    </button>
                                    <button
                                      type="button"
                                      disabled={slotKey === 'tengah'}
                                      onClick={() => moveSigner('left_signer', 'tengah')}
                                      className={`px-1 py-0.5 text-[6.5px] font-bold rounded ${
                                        slotKey === 'tengah' ? 'bg-blue-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                      }`}
                                    >
                                      Tengah
                                    </button>
                                    <button
                                      type="button"
                                      disabled={slotKey === 'kanan'}
                                      onClick={() => moveSigner('left_signer', 'kanan')}
                                      className={`px-1 py-0.5 text-[6.5px] font-bold rounded ${
                                        slotKey === 'kanan' ? 'bg-blue-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                      }`}
                                    >
                                      Kanan
                                    </button>
                                  </div>
                                </div>
                              ) : slotOccupant === 'right_signer' ? (
                                <div
                                  draggable={true}
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', 'right_signer');
                                    setDraggedSigner('right_signer');
                                  }}
                                  onDragEnd={() => {
                                    setDraggedSigner(null);
                                    setDragOverSlot(null);
                                  }}
                                  className="group cursor-grab active:cursor-grabbing select-none space-y-0.5 text-[8px]"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-600 truncate">
                                      {settings.signatureKota || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    </span>
                                    <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition" />
                                  </div>
                                  <p className="font-bold text-slate-800 truncate">
                                    {settings.signatureJabatanKanan || 'Kepala Sekolah'}
                                  </p>
                                  <div className="h-8 flex items-center justify-center gap-1 my-0.5">
                                    {settings.signatureRightImageUrl ? (
                                      <img
                                        src={settings.signatureRightImageUrl}
                                        alt="TTD Kanan Digital"
                                        className="h-7 max-w-[65px] object-contain"
                                      />
                                    ) : (
                                      <span className="text-[7px] italic text-slate-400">(Tanda Tangan)</span>
                                    )}
                                    {settings.signatureQrVerification !== false && (
                                      <div className="w-6 h-6 border border-slate-700 bg-slate-100 flex items-center justify-center text-[5.5px] text-slate-800 font-bold rounded shrink-0">
                                        QR
                                      </div>
                                    )}
                                  </div>
                                  <p className="font-bold text-slate-900 underline truncate">
                                    {settings.signatureNamaKanan || 'Dr. H. Bambang Sudarsono, M.Si'}
                                  </p>
                                  <p className="text-[7px] text-slate-600 truncate">
                                    {settings.signatureNipKanan || 'NIP. 19690415 199403 1 004'}
                                  </p>

                                  {/* Quick Slot Shift Buttons */}
                                  <div className="pt-1.5 flex items-center justify-center gap-1 border-t border-slate-200 mt-1">
                                    <button
                                      type="button"
                                      disabled={slotKey === 'kiri'}
                                      onClick={() => moveSigner('right_signer', 'kiri')}
                                      className={`px-1 py-0.5 text-[6.5px] font-bold rounded ${
                                        slotKey === 'kiri' ? 'bg-emerald-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                      }`}
                                    >
                                      Kiri
                                    </button>
                                    <button
                                      type="button"
                                      disabled={slotKey === 'tengah'}
                                      onClick={() => moveSigner('right_signer', 'tengah')}
                                      className={`px-1 py-0.5 text-[6.5px] font-bold rounded ${
                                        slotKey === 'tengah' ? 'bg-emerald-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                      }`}
                                    >
                                      Tengah
                                    </button>
                                    <button
                                      type="button"
                                      disabled={slotKey === 'kanan'}
                                      onClick={() => moveSigner('right_signer', 'kanan')}
                                      className={`px-1 py-0.5 text-[6.5px] font-bold rounded ${
                                        slotKey === 'kanan' ? 'bg-emerald-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                      }`}
                                    >
                                      Kanan
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full flex flex-col items-center justify-center py-4 text-center">
                                  <p className="text-[7.5px] font-medium text-slate-400">
                                    (Kosong)
                                  </p>
                                  <p className="text-[6.5px] text-slate-400 mt-0.5">
                                    Tarik tanda tangan ke zona ini
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Footer Mockup */}
                  <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-[7px] text-slate-400">
                    <span>{settings.appName} — Sistem Informasi Manajemen Sekolah Digital</span>
                    <span>Halaman 1 dari 1</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Format ini otomatis diterapkan ke seluruh ekspor PDF di menu <strong>Master Akademik</strong>, <strong>Rapor Nilai</strong>, dan <strong>Rekapitulasi Presensi</strong>.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Fitur Keamanan & Anti-Cheat Telah Dipindahkan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Pengaturan sistem keamanan peramban, anti-cheat, pemblokiran DevTools/klik kanan, dan pop-up peringatan kini dapat diakses secara langsung dan mudah melalui menu <strong>Sistem & Keamanan &gt; Keamanan & Anti-Cheat</strong> di bilah navigasi.
            </p>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('security_settings')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Buka Menu Keamanan & Anti-Cheat</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
