import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Command,
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
  ShieldCheck,
  CalendarClock,
  FileText,
  HelpCircle,
  Moon,
  Sun,
  RefreshCw,
  LogOut,
  X,
  ArrowRight,
  Sparkles,
  Wifi,
  CornerDownLeft
} from 'lucide-react';
import { User, UserRole } from '../types';
import { FirestoreSyncService } from '../services/firestoreSyncService';
import Swal from 'sweetalert2';

export interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: 'Akademik' | 'Manajemen Data' | 'Pengaturan' | 'Sistem & Keamanan' | 'Aksi Cepat';
  icon: React.ElementType;
  keywords: string[];
  tabId?: string;
  action?: () => void;
  badge?: string;
  allowedRoles: UserRole[];
}

interface QuickCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSelectTab: (tabId: string) => void;
  onOpenTour: () => void;
  onLogout: () => void;
}

export const QuickCommandPalette: React.FC<QuickCommandPaletteProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectTab,
  onOpenTour,
  onLogout
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsListRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Master list of searchable commands
  const allCommands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      // Akademik
      {
        id: 'cmd-dashboard',
        title: 'Dasbor Utama',
        description: 'Ringkasan statistik sekolah, grafik presensi, dan aktivitas terkini',
        category: 'Akademik',
        icon: TrendingUp,
        keywords: ['dashboard', 'beranda', 'home', 'statistik', 'grafik', 'utama'],
        tabId: 'dashboard',
        allowedRoles: ['admin', 'wali_kelas', 'guru', 'siswa', 'orang_tua']
      },
      {
        id: 'cmd-student-portal',
        title: currentUser.role === 'orang_tua' ? 'Portal Wali Murid' : 'Portal Siswa',
        description: 'Biodata, rekap kehadiran siswa, jadwal pelajaran, dan kartu rapor',
        category: 'Akademik',
        icon: GraduationCap,
        keywords: ['portal', 'siswa', 'wali murid', 'biodata', 'rapor siswa', 'presensi saya'],
        tabId: 'student_portal',
        allowedRoles: ['siswa', 'orang_tua']
      },
      {
        id: 'cmd-attendance',
        title: 'Presensi Siswa',
        description: 'Rekapitulasi absensi harian, kamera selfie siswa, koordinat GPS & filter kelas',
        category: 'Akademik',
        icon: CalendarCheck2,
        keywords: ['presensi', 'absen', 'kehadiran', 'foto selfie', 'gps', 'izin', 'sakit', 'alpha'],
        tabId: 'attendance',
        allowedRoles: ['admin', 'wali_kelas', 'guru']
      },
      {
        id: 'cmd-grades',
        title: 'Nilai & Rapor',
        description: 'Input nilai tugas, formatif, sumatif, cetak rapor, dan ekspor ledger nilai',
        category: 'Akademik',
        icon: Award,
        keywords: ['nilai', 'rapor', 'tugas', 'ulangan', 'pts', 'pas', 'leger', 'predikat', 'cetak rapor'],
        tabId: 'grades',
        allowedRoles: ['admin', 'wali_kelas', 'guru']
      },
      {
        id: 'cmd-teacher-journal',
        title: 'Jurnal Mengajar Guru',
        description: 'Pencatatan kegiatan belajar mengajar (KBM), materi, kompetensi & agenda kelas',
        category: 'Akademik',
        icon: BookOpen,
        keywords: ['jurnal', 'kbm', 'materi', 'guru', 'agenda', 'catatan mengajar'],
        tabId: 'teacher_journal',
        allowedRoles: ['admin', 'wali_kelas', 'guru']
      },
      {
        id: 'cmd-homeroom',
        title: 'Menu Wali Kelas',
        description: 'Rekap kehadiran rombel, catatan wali kelas, rapor kelas binaan & profil siswa',
        category: 'Akademik',
        icon: School,
        keywords: ['wali kelas', 'rombel', 'catatan siswa', 'rekap kelas'],
        tabId: 'homeroom',
        allowedRoles: ['admin', 'wali_kelas']
      },

      // Manajemen Data
      {
        id: 'cmd-master-academic',
        title: 'Master Data Akademik',
        description: 'Kelola Tahun Ajaran, Semester aktif, Daftar Kelas (Rombel), Mapel & Jam Pelajaran',
        category: 'Manajemen Data',
        icon: GraduationCap,
        keywords: ['master', 'tahun ajaran', 'semester', 'kelas', 'mapel', 'mata pelajaran', 'jam kbm'],
        tabId: 'master_academic',
        allowedRoles: ['admin']
      },
      {
        id: 'cmd-users',
        title: 'Manajemen Pengguna',
        description: 'Data Akun Guru, Siswa, Wali Kelas, Wali Murid, import Excel & reset password',
        category: 'Manajemen Data',
        icon: Users,
        keywords: ['pengguna', 'user', 'akun', 'guru', 'siswa', 'tambah akun', 'excel', 'import', 'password'],
        tabId: 'users',
        allowedRoles: ['admin']
      },
      {
        id: 'cmd-drive-photos',
        title: 'Arsip Foto Google Drive',
        description: 'Galeri foto presensi, pasfoto siswa di Google Drive cloud storage',
        category: 'Manajemen Data',
        icon: HardDrive,
        keywords: ['foto', 'drive', 'google drive', 'pasfoto', 'galeri', 'cloud storage', 'berkas'],
        tabId: 'drive_photos',
        allowedRoles: ['admin']
      },
      {
        id: 'cmd-scheduled-exports',
        title: 'Jadwal Ekspor & Cloud Backup',
        description: 'Otomatisasi ekspor data akademik, backup berkala ke cloud spreadsheet',
        category: 'Manajemen Data',
        icon: CalendarClock,
        keywords: ['ekspor', 'backup', 'cloud', 'jadwal', 'otomatis', 'excel export', 'sync'],
        tabId: 'scheduled_exports',
        badge: 'Otomatis',
        allowedRoles: ['admin']
      },

      // Pengaturan
      {
        id: 'cmd-app-settings',
        title: 'Identitas Sekolah & Logo',
        description: 'Kustomisasi nama sekolah, logo utama, favicon, warna tema & instansi',
        category: 'Pengaturan',
        icon: Settings,
        keywords: ['identitas', 'sekolah', 'logo', 'favicon', 'nama aplikasi', 'pengaturan'],
        tabId: 'app_settings',
        allowedRoles: ['admin']
      },
      {
        id: 'cmd-running-text',
        title: 'Pengumuman & Running Text',
        description: 'Pengaturan teks berjalan di bilah atas aplikasi dan portal siswa',
        category: 'Pengaturan',
        icon: Megaphone,
        keywords: ['running text', 'pengumuman', 'teks berjalan', 'info', 'banner'],
        tabId: 'running_text',
        allowedRoles: ['admin']
      },
      {
        id: 'cmd-kop-settings',
        title: 'Kertas, Kop Surat & Tanda Tangan',
        description: 'Format cetak PDF rapor, margin kertas, kop surat instansi & tanda tangan digital',
        category: 'Pengaturan',
        icon: FileText,
        keywords: ['kop surat', 'tanda tangan', 'kertas', 'pdf', 'margin', 'ttd', 'kepala sekolah', 'cetak'],
        tabId: 'kop_settings',
        allowedRoles: ['admin']
      },

      // Sistem & Keamanan
      {
        id: 'cmd-architecture',
        title: 'Cloud Firestore & Replikasi',
        description: 'Panel status database Firestore, sinkronisasi cloud real-time & arsitektur data',
        category: 'Sistem & Keamanan',
        icon: Database,
        keywords: ['firebase', 'firestore', 'database', 'arsitektur', 'cloud', 'replikasi', 'koneksi'],
        tabId: 'architecture',
        allowedRoles: ['admin']
      },
      {
        id: 'cmd-security-settings',
        title: 'Keamanan & Anti-Cheat Presensi',
        description: 'Proteksi radius GPS, pencegahan fake GPS/mock location, dan enkripsi sesi',
        category: 'Sistem & Keamanan',
        icon: ShieldCheck,
        keywords: ['keamanan', 'anti cheat', 'fake gps', 'mock location', 'radius', 'security', 'enkripsi'],
        tabId: 'security_settings',
        allowedRoles: ['admin']
      },
      {
        id: 'cmd-activity-logs',
        title: 'Log Aktivitas & Audit Trail',
        description: 'Rekam jejak tindakan pengguna, waktu masuk/keluar & histori manipulasi data',
        category: 'Sistem & Keamanan',
        icon: History,
        keywords: ['log', 'aktivitas', 'audit', 'riwayat', 'histori', 'jejak', 'audit trail'],
        tabId: 'activity_logs',
        allowedRoles: ['admin']
      },

      // Aksi Cepat
      {
        id: 'cmd-action-sync',
        title: 'Sinkronkan Data ke Firestore Sekarang',
        description: 'Dorong seluruh entitas data lokal ke Google Cloud Firestore',
        category: 'Aksi Cepat',
        icon: RefreshCw,
        keywords: ['sync', 'sinkron', 'push firestore', 'kirim data cloud'],
        action: async () => {
          onClose();
          const syncService = FirestoreSyncService.getInstance();
          try {
            Swal.fire({
              title: 'Menyinkronkan...',
              text: 'Mengirim snapshot data ke Cloud Firestore',
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading();
              }
            });
            const count = await syncService.pushAllDataToFirestore();
            Swal.fire({
              icon: 'success',
              title: 'Sinkronisasi Berhasil!',
              text: `${count} dokumen telah disinkronkan ke Cloud Firestore.`,
              timer: 2000,
              showConfirmButton: false
            });
          } catch (err: any) {
            Swal.fire({
              icon: 'error',
              title: 'Gagal Sinkron',
              text: err.message || 'Terjadi kesalahan saat menyinkronkan data.'
            });
          }
        },
        allowedRoles: ['admin']
      },
      {
        id: 'cmd-action-tour',
        title: 'Buka Panduan Interaktif Sistem',
        description: 'Mulai tur panduan langkah demi langkah fitur aplikasi SIMAK',
        category: 'Aksi Cepat',
        icon: HelpCircle,
        keywords: ['tur', 'panduan', 'bantuan', 'help', 'tutorial', 'guide'],
        action: () => {
          onClose();
          onOpenTour();
        },
        allowedRoles: ['admin', 'wali_kelas', 'guru', 'siswa', 'orang_tua']
      },
      {
        id: 'cmd-action-theme',
        title: 'Ganti Tema (Gelap / Terang)',
        description: 'Beralih antara mode tampilan Dark Mode dan Light Mode',
        category: 'Aksi Cepat',
        icon: Sparkles,
        keywords: ['tema', 'dark mode', 'light mode', 'gelap', 'terang', 'mode malam'],
        action: () => {
          onClose();
          const isDark = document.documentElement.classList.contains('dark');
          if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
          } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
          }
        },
        allowedRoles: ['admin', 'wali_kelas', 'guru', 'siswa', 'orang_tua']
      },
      {
        id: 'cmd-action-logout',
        title: 'Keluar dari Akun (Logout)',
        description: 'Mengakhiri sesi aktif pengguna saat ini secara aman',
        category: 'Aksi Cepat',
        icon: LogOut,
        keywords: ['logout', 'keluar', 'sign out', 'tutup sesi'],
        action: () => {
          onClose();
          onLogout();
        },
        allowedRoles: ['admin', 'wali_kelas', 'guru', 'siswa', 'orang_tua']
      }
    ];

    return list.filter((item) => item.allowedRoles.includes(currentUser.role));
  }, [currentUser.role, onOpenTour, onLogout, onClose]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCommands;

    return allCommands.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((kw) => kw.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchCat || matchKeywords;
    });
  }, [query, allCommands]);

  // Keep selected index in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Execute selected command
  const executeCommand = (item: CommandItem) => {
    if (item.action) {
      item.action();
    } else if (item.tabId) {
      onSelectTab(item.tabId);
      onClose();
    }
  };

  // Keyboard navigation within the palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (resultsListRef.current) {
      const activeEl = resultsListRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-start justify-center pt-16 sm:pt-24 px-3 sm:px-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Pencarian Cepat Modul (Ctrl+K)"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik modul, pengaturan, presensi, rapor, atau aksi..."
            className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden"
          />

          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
              <span>ESC</span>
            </div>
          )}
        </div>

        {/* Results List */}
        <div
          ref={resultsListRef}
          className="max-h-[60vh] overflow-y-auto p-2 sm:p-3 space-y-1 divide-y divide-slate-100/60 dark:divide-slate-800/40"
        >
          {filteredCommands.length > 0 ? (
            filteredCommands.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={item.id}
                  data-index={index}
                  onClick={() => executeCommand(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`group flex items-center justify-between gap-3 p-3 rounded-xl transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs sm:text-sm font-bold truncate ${
                            isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                              isSelected
                                ? 'bg-white/25 text-white'
                                : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`hidden sm:inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/70'
                      }`}
                    >
                      {item.category}
                    </span>
                    <CornerDownLeft
                      className={`w-3.5 h-3.5 transition-opacity ${
                        isSelected ? 'opacity-100 text-white' : 'opacity-0'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Tidak ada hasil ditemukan</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Coba cari dengan kata kunci lain seperti <em>"presensi"</em>, <em>"nilai"</em>, <em>"logo"</em>, atau <em>"sync"</em>.
              </p>
            </div>
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 sm:px-5 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-bold text-[10px] text-slate-700 dark:text-slate-300">
                ↑↓
              </kbd>
              <span>Navigasi</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-bold text-[10px] text-slate-700 dark:text-slate-300">
                ↵
              </kbd>
              <span>Pilih</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <span>Navigasi Cepat SIMAK</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
