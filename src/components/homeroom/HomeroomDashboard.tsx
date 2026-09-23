import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  Calendar,
  Sparkles,
  Award,
  Grid,
  PieChart,
  Users,
  Crown,
  PackageCheck,
  HeartHandshake,
  ClipboardCheck,
  Smile,
  DollarSign,
  BookOpen,
  ArrowLeftRight,
  AlertOctagon,
  Trophy,
  Home,
  ChevronRight,
  ChevronLeft,
  Search,
  School,
  Printer,
  Newspaper,
  RotateCcw,
  LayoutGrid,
  Filter
} from 'lucide-react';
import { HomeroomService } from '../../services/homeroomService';
import { HomeroomDataPackage } from '../../types/homeroom';
import { HomeroomSchedule } from './HomeroomSchedule';
import { HomeroomPiket } from './HomeroomPiket';
import { HomeroomAgreement } from './HomeroomAgreement';
import { HomeroomSeating } from './HomeroomSeating';
import { HomeroomStatistics } from './HomeroomStatistics';
import { HomeroomIdentities } from './HomeroomIdentities';
import { HomeroomStructure } from './HomeroomStructure';
import { HomeroomInventory } from './HomeroomInventory';
import { HomeroomGuidance } from './HomeroomGuidance';
import { HomeroomPiketAttendance } from './HomeroomPiketAttendance';
import { HomeroomAttitude } from './HomeroomAttitude';
import { HomeroomTreasury } from './HomeroomTreasury';
import { HomeroomJournal } from './HomeroomJournal';
import { HomeroomMutation } from './HomeroomMutation';
import { HomeroomCases } from './HomeroomCases';
import { HomeroomAchievements } from './HomeroomAchievements';
import { HomeroomHomeVisits } from './HomeroomHomeVisits';
import { HomeroomBulletinBoard } from './HomeroomBulletinBoard';
import { HomeroomPdfExporter } from '../../services/homeroomPdfExporter';

interface HomeroomDashboardProps {
  currentClassId?: string;
  userRole?: string;
  currentUserName?: string;
  studentList?: Array<{ id: string; nama: string }>;
}

export type HomeroomMenuId =
  | 'schedule' // 1
  | 'piket' // 2
  | 'agreement' // 3
  | 'seating' // 4
  | 'statistics' // 5
  | 'identities' // 6
  | 'structure' // 7
  | 'inventory' // 8
  | 'guidance' // 9
  | 'piket_attendance' // 10
  | 'attitude' // 11
  | 'treasury' // 12
  | 'journal' // 13
  | 'mutation' // 14
  | 'cases' // 15
  | 'achievements' // 16
  | 'home_visits' // 17
  | 'mading'; // 18

interface MenuItem {
  num: number;
  id: HomeroomMenuId;
  title: string;
  desc: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const ALL_MENUS: MenuItem[] = [
  {
    num: 1,
    id: 'schedule',
    title: 'Daftar Pelajaran',
    desc: 'Jadwal pelajaran mingguan & jam KBM',
    category: 'Akademik & KBM',
    icon: Calendar,
    color: 'bg-blue-500 text-white'
  },
  {
    num: 2,
    id: 'piket',
    title: 'Daftar Piket',
    desc: 'Pembagian kelompok kerja kebersihan',
    category: 'Ketertiban & Budaya',
    icon: Sparkles,
    color: 'bg-emerald-500 text-white'
  },
  {
    num: 3,
    id: 'agreement',
    title: 'Kesepakatan Kelas',
    desc: 'Piagam komitmen dan norma bersama',
    category: 'Ketertiban & Budaya',
    icon: Award,
    color: 'bg-purple-500 text-white'
  },
  {
    num: 4,
    id: 'seating',
    title: 'Denah Tempat Duduk',
    desc: 'Tata letak meja siswa & meja guru',
    category: 'Ketertiban & Budaya',
    icon: Grid,
    color: 'bg-cyan-500 text-white'
  },
  {
    num: 5,
    id: 'statistics',
    title: 'Data Statistik Siswa',
    desc: 'Demografi gender, KIP, transport & jarak',
    category: 'Data & Profil',
    icon: PieChart,
    color: 'bg-indigo-500 text-white'
  },
  {
    num: 6,
    id: 'identities',
    title: 'Data Identitas Siswa',
    desc: 'Buku induk, biodata, NIS, NISN, kontak ortu',
    category: 'Data & Profil',
    icon: Users,
    color: 'bg-teal-500 text-white'
  },
  {
    num: 7,
    id: 'structure',
    title: 'Struktur Kelas',
    desc: 'Bagan organisasi pengurus & seksi kelas',
    category: 'Data & Profil',
    icon: Crown,
    color: 'bg-amber-500 text-white'
  },
  {
    num: 8,
    id: 'inventory',
    title: 'Kartu Inventaris Ruangan',
    desc: 'Pencatatan sarpras & mebeler ruang (KIR)',
    category: 'Sarana & Keuangan',
    icon: PackageCheck,
    color: 'bg-orange-500 text-white'
  },
  {
    num: 9,
    id: 'guidance',
    title: 'Kegiatan Pembimbingan Kelas',
    desc: 'Catatan bimbingan pribadi, akademik & sosial',
    category: 'Bimbingan & Karakter',
    icon: HeartHandshake,
    color: 'bg-pink-500 text-white'
  },
  {
    num: 10,
    id: 'piket_attendance',
    title: 'Absensi Piket',
    desc: 'Presensi harian regu kebersihan & skor ruang',
    category: 'Ketertiban & Budaya',
    icon: ClipboardCheck,
    color: 'bg-lime-600 text-white'
  },
  {
    num: 11,
    id: 'attitude',
    title: 'Penilaian Sikap',
    desc: 'Observasi sikap spiritual, sosial & rapor',
    category: 'Bimbingan & Karakter',
    icon: Smile,
    color: 'bg-yellow-500 text-white'
  },
  {
    num: 12,
    id: 'treasury',
    title: 'Rincian Administrasi Sekolah',
    desc: 'Rincian pembayaran SPP, Asrama, Buku, Praktikum & Kesiswaan',
    category: 'Sarana & Keuangan',
    icon: DollarSign,
    color: 'bg-emerald-600 text-white'
  },
  {
    num: 13,
    id: 'journal',
    title: 'Jurnal Kelas',
    desc: 'Agenda materi harian & kehadiran KBM',
    category: 'Akademik & KBM',
    icon: BookOpen,
    color: 'bg-violet-500 text-white'
  },
  {
    num: 14,
    id: 'mutation',
    title: 'Daftar Mutasi',
    desc: 'Buku perpindahan siswa masuk & keluar',
    category: 'Data & Profil',
    icon: ArrowLeftRight,
    color: 'bg-sky-500 text-white'
  },
  {
    num: 15,
    id: 'cases',
    title: 'Catatan Kasus',
    desc: 'Pelanggaran disiplin, poin & pembinaan',
    category: 'Ketertiban & Budaya',
    icon: AlertOctagon,
    color: 'bg-rose-500 text-white'
  },
  {
    num: 16,
    id: 'achievements',
    title: 'Catatan Prestasi Siswa',
    desc: 'Perolehan kejuaraan & penghargaan siswa',
    category: 'Bimbingan & Karakter',
    icon: Trophy,
    color: 'bg-amber-600 text-white'
  },
  {
    num: 17,
    id: 'home_visits',
    title: 'Kunjungan Rumah',
    desc: 'Home visit, silaturahmi & kesepakatan ortu',
    category: 'Bimbingan & Karakter',
    icon: Home,
    color: 'bg-emerald-700 text-white'
  },
  {
    num: 18,
    id: 'mading',
    title: 'Dokumentasi & Mading Kelas',
    desc: 'Mading digital, galeri kegiatan & karya siswa',
    category: 'Ketertiban & Budaya',
    icon: Newspaper,
    color: 'bg-rose-600 text-white'
  }
];

export const HomeroomDashboard: React.FC<HomeroomDashboardProps> = ({
  currentClassId = 'class_10_ipa1',
  userRole = 'wali_kelas',
  currentUserName = 'Puput Sasmita, S.Pd., Gr.',
  studentList: propStudents
}) => {
  const service = HomeroomService.getInstance();
  const [classId, setClassId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('SIMAK_HOMEROOM_CLASS_ID');
      if (saved) return saved;
    } catch (e) {}
    return currentClassId;
  });
  const [dataPackage, setDataPackage] = useState<HomeroomDataPackage | null>(null);
  const [activeMenu, setActiveMenu] = useState<HomeroomMenuId>(() => {
    try {
      const saved = localStorage.getItem('SIMAK_HOMEROOM_ACTIVE_MENU');
      if (saved && ALL_MENUS.some(m => m.id === saved)) {
        return saved as HomeroomMenuId;
      }
    } catch (e) {}
    return 'schedule';
  });
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'pills' | 'grid'>('pills');

  // Categories list
  const categories = [
    { id: 'all', label: 'Semua (18)' },
    { id: 'Akademik & KBM', label: 'Akademik (2)' },
    { id: 'Ketertiban & Budaya', label: 'Ketertiban (5)' },
    { id: 'Data & Profil', label: 'Data & Profil (4)' },
    { id: 'Sarana & Keuangan', label: 'Sarana (2)' },
    { id: 'Bimbingan & Karakter', label: 'Bimbingan (5)' }
  ];

  // Save classId and activeMenu when changed
  useEffect(() => {
    try {
      localStorage.setItem('SIMAK_HOMEROOM_CLASS_ID', classId);
    } catch (e) {}
  }, [classId]);

  useEffect(() => {
    try {
      localStorage.setItem('SIMAK_HOMEROOM_ACTIVE_MENU', activeMenu);
    } catch (e) {}
  }, [activeMenu]);

  const refreshData = () => {
    const pkg = service.getHomeroomData(classId);
    setDataPackage(pkg);
  };

  useEffect(() => {
    refreshData();
  }, [classId]);

  if (!dataPackage) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        Memuat data administrasi wali kelas...
      </div>
    );
  }

  const studentList =
    propStudents && propStudents.length > 0
      ? propStudents
      : dataPackage.studentIdentities.map(i => ({ id: i.id, nama: i.fullName }));

  const classNamesMap: Record<string, string> = {
    class_10_ipa1: 'Kelas X-IPA-1',
    class_10_ipa2: 'Kelas X-IPA-2',
    class_11_mipa1: 'Kelas XI-MIPA-1'
  };
  const currentClassName = classNamesMap[classId] || classId;

  const activeIndex = ALL_MENUS.findIndex(m => m.id === activeMenu);
  const activeMenuItem = ALL_MENUS[activeIndex] || ALL_MENUS[0];

  const handlePrevMenu = () => {
    const prevIdx = activeIndex > 0 ? activeIndex - 1 : ALL_MENUS.length - 1;
    setActiveMenu(ALL_MENUS[prevIdx].id);
  };

  const handleNextMenu = () => {
    const nextIdx = activeIndex < ALL_MENUS.length - 1 ? activeIndex + 1 : 0;
    setActiveMenu(ALL_MENUS[nextIdx].id);
  };

  const handleResetClassData = () => {
    Swal.fire({
      title: 'Reset Data Kelas ke Standar?',
      text: `Semua data 18 administrasi untuk ${currentClassName} akan dikembalikan ke data awal contoh.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.resetClassHomeroomData(classId);
        refreshData();
        Swal.fire({
          title: 'Berhasil Direset',
          text: `Data administrasi ${currentClassName} telah dipulihkan ke format standar.`,
          icon: 'success',
          timer: 1800,
          showConfirmButton: false
        });
      }
    });
  };

  const filteredMenus = ALL_MENUS.filter(m => {
    const matchesSearch =
      !menuSearch ||
      m.title.toLowerCase().includes(menuSearch.toLowerCase()) ||
      m.num.toString() === menuSearch.trim() ||
      m.category.toLowerCase().includes(menuSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-5">
      {/* Top Banner / Class Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
              <School className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                  ADMINISTRASI WALI KELAS
                </span>
                <span className="text-[11px] text-slate-300 font-mono hidden sm:inline">18 Fitur Terintegrasi</span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white mt-0.5">
                Ruang Wali Kelas: {currentClassName}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300">
                Wali Kelas: <strong className="text-white">Budi Santoso, S.Pd</strong> • NIP: 198503152010011008
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <label className="text-xs text-slate-200 font-bold whitespace-nowrap hidden sm:inline">Kelas:</label>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="class_10_ipa1">Kelas X-IPA-1 (Binaan Utama)</option>
                <option value="class_10_ipa2">Kelas X-IPA-2</option>
                <option value="class_11_mipa1">Kelas XI-MIPA-1</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                if (dataPackage) {
                  HomeroomPdfExporter.exportAllHomeroomPDF(currentClassName, dataPackage);
                }
              }}
              title="Cetak seluruh rangkuman dokumen administrasi 18 menu ke PDF"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[11px] font-bold text-white flex items-center gap-1.5 transition shadow-xs shadow-indigo-500/25 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Buku Lengkap</span>
            </button>

            <button
              type="button"
              onClick={handleResetClassData}
              title="Reset data kelas binaan ini ke template awal default"
              className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl text-[11px] font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* 18 Menu Quick Selector Carousel / Grid */}
      <div className="bg-white dark:bg-slate-800 p-3.5 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        {/* Filter bar & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                18 Menu Administrasi:
              </span>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                [#{activeMenuItem.num}] {activeMenuItem.title}
              </span>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('pills')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  viewMode === 'pills'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Pills
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Grid
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              value={menuSearch}
              onChange={e => setMenuSearch(e.target.value)}
              placeholder="Cari menu 1-18 atau nama..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer border ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Display: Pills Mode */}
        {viewMode === 'pills' && (
          <div className="flex flex-wrap gap-1.5 pt-1 max-h-48 overflow-y-auto pr-1">
            {filteredMenus.map(m => {
              const Icon = m.icon;
              const isActive = activeMenu === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMenu(m.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs shadow-indigo-500/25'
                      : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-black shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {m.num}
                  </span>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{m.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Display: Grid / Bento Cards Mode (Proportional & Touch-friendly) */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 max-h-64 overflow-y-auto pr-1">
            {filteredMenus.map(m => {
              const Icon = m.icon;
              const isActive = activeMenu === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMenu(m.id)}
                  className={`p-2.5 rounded-2xl text-left border flex flex-col justify-between gap-2 transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black ${
                        isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {m.num}
                    </span>
                    <div className={`p-1.5 rounded-xl ${m.color} shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs font-bold leading-tight ${isActive ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                      {m.title}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {m.category}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Sub-Module Navigation Header Bar */}
      <div className="bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handlePrevMenu}
          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sebelumnya</span>
        </button>

        <div className="flex items-center gap-2 overflow-hidden">
          <select
            value={activeMenu}
            onChange={e => setActiveMenu(e.target.value as HomeroomMenuId)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 truncate max-w-[200px] sm:max-w-xs cursor-pointer"
          >
            {ALL_MENUS.map(m => (
              <option key={m.id} value={m.id}>
                #{m.num} - {m.title} ({m.category})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleNextMenu}
          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
        >
          <span className="hidden sm:inline">Selanjutnya</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Active Sub-module Container */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs min-h-[500px]">
        {activeMenu === 'schedule' && (
          <HomeroomSchedule
            classId={classId}
            className={currentClassName}
            schedules={dataPackage.lessonSchedules}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'piket' && (
          <HomeroomPiket
            classId={classId}
            className={currentClassName}
            piketSchedules={dataPackage.piketSchedules}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'agreement' && (
          <HomeroomAgreement
            classId={classId}
            className={currentClassName}
            agreement={dataPackage.classAgreement}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'seating' && (
          <HomeroomSeating
            classId={classId}
            className={currentClassName}
            layout={dataPackage.seatingLayout}
            studentList={studentList}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'statistics' && (
          <HomeroomStatistics
            className={currentClassName}
            identities={dataPackage.studentIdentities}
          />
        )}

        {activeMenu === 'identities' && (
          <HomeroomIdentities
            classId={classId}
            className={currentClassName}
            identities={dataPackage.studentIdentities}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'structure' && (
          <HomeroomStructure
            classId={classId}
            className={currentClassName}
            structure={dataPackage.classStructure}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'inventory' && (
          <HomeroomInventory
            classId={classId}
            className={currentClassName}
            inventories={dataPackage.inventories}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'guidance' && (
          <HomeroomGuidance
            classId={classId}
            className={currentClassName}
            guidanceLogs={dataPackage.guidanceLogs}
            studentList={studentList}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'piket_attendance' && (
          <HomeroomPiketAttendance
            classId={classId}
            className={currentClassName}
            piketAttendanceLogs={dataPackage.piketAttendanceLogs}
            studentList={studentList}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'attitude' && (
          <HomeroomAttitude
            classId={classId}
            className={currentClassName}
            assessments={dataPackage.attitudeAssessments}
            studentList={studentList}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'treasury' && (
          <HomeroomTreasury
            classId={classId}
            className={currentClassName}
            transactions={dataPackage.treasuryTransactions}
            studentList={studentList}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'journal' && (
          <HomeroomJournal
            classId={classId}
            className={currentClassName}
            journals={dataPackage.classJournals}
            userRole={userRole}
            currentUserName={currentUserName}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'mutation' && (
          <HomeroomMutation
            classId={classId}
            className={currentClassName}
            mutations={dataPackage.studentMutations}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'cases' && (
          <HomeroomCases
            classId={classId}
            className={currentClassName}
            cases={dataPackage.studentCases}
            studentList={studentList}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'achievements' && (
          <HomeroomAchievements
            classId={classId}
            className={currentClassName}
            achievements={dataPackage.studentAchievements}
            studentList={studentList}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'home_visits' && (
          <HomeroomHomeVisits
            classId={classId}
            className={currentClassName}
            homeVisits={dataPackage.homeVisits}
            studentList={studentList}
            onRefresh={refreshData}
          />
        )}

        {activeMenu === 'mading' && (
          <HomeroomBulletinBoard
            classId={classId}
            className={currentClassName}
            bulletinItems={dataPackage.classBulletinBoard || []}
            studentList={studentList}
            onRefresh={refreshData}
          />
        )}
      </div>
    </div>
  );
};
