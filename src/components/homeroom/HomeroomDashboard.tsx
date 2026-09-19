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
  Search,
  School,
  Printer,
  Newspaper,
  RotateCcw
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

interface HomeroomDashboardProps {
  currentClassId?: string;
  userRole?: string;
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
    desc: 'Buku kas keuangan kelas & iuran kesiswaan',
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
  studentList: propStudents
}) => {
  const service = HomeroomService.getInstance();
  const [classId, setClassId] = useState<string>(currentClassId);
  const [dataPackage, setDataPackage] = useState<HomeroomDataPackage | null>(null);
  const [activeMenu, setActiveMenu] = useState<HomeroomMenuId>('schedule');
  const [menuSearch, setMenuSearch] = useState('');

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

  const activeMenuItem = ALL_MENUS.find(m => m.id === activeMenu) || ALL_MENUS[0];

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

  const filteredMenus = ALL_MENUS.filter(
    m =>
      !menuSearch ||
      m.title.toLowerCase().includes(menuSearch.toLowerCase()) ||
      m.num.toString() === menuSearch.trim() ||
      m.category.toLowerCase().includes(menuSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Class Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                  ADMINISTRASI WALI KELAS
                </span>
                <span className="text-xs text-slate-400 font-mono">18 Fitur Terintegrasi</span>
              </div>
              <h2 className="text-xl font-black text-white mt-0.5">
                Ruang Wali Kelas: {currentClassName}
              </h2>
              <p className="text-xs text-slate-400">
                Wali Kelas: <strong className="text-slate-200">Budi Santoso, S.Pd</strong> • NIP: 198503152010011008
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-300 font-bold whitespace-nowrap">Pilih Kelas Binaan:</label>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="class_10_ipa1">Kelas X-IPA-1 (Binaan Utama)</option>
                <option value="class_10_ipa2">Kelas X-IPA-2</option>
                <option value="class_11_mipa1">Kelas XI-MIPA-1</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleResetClassData}
              title="Reset data kelas binaan ini ke template awal default"
              className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Default</span>
            </button>
          </div>
        </div>
      </div>

      {/* 18 Menu Quick Selector Carousel / Grid */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              DAFTAR 18 MENU WALI KELAS:
            </span>
            <span className="text-xs text-slate-400">({ALL_MENUS.length} Modul Lengkap)</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={menuSearch}
              onChange={e => setMenuSearch(e.target.value)}
              placeholder="Cari menu 1-18 atau nama fitur..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
            />
          </div>
        </div>

        {/* Horizontal Scrolling or Compact Pills for all 18 menus */}
        <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
          {filteredMenus.map(m => {
            const Icon = m.icon;
            const isActive = activeMenu === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveMenu(m.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs shadow-indigo-500/25'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {m.num}
                </span>
                <Icon className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{m.title}</span>
              </button>
            );
          })}
        </div>
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
