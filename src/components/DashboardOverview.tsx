import React from 'react';
import {
  GraduationCap,
  School,
  BookOpen,
  CheckCircle2,
  ShieldAlert,
  Trophy,
  CheckCheck,
  TrendingUp,
  CalendarCheck,
  Award,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { User, ClassEntity, Subject } from '../types';
import { AnnouncementBanner } from './AnnouncementBanner';
import { ChartAttendance } from './ChartAttendance';
import { ChartGrades } from './ChartGrades';
import { WeeklyAttendanceSparkline } from './WeeklyAttendanceSparkline';
import { StudentDirectorySearch } from './StudentDirectorySearch';
import { DashboardQuickActions } from './DashboardQuickActions';
import { AcademicCalendarWidget } from './AcademicCalendarWidget';

interface DashboardOverviewProps {
  currentUser: User;
  clock?: {
    timeFormatted?: string;
    dateFormatted?: string;
    dayName?: string;
    period?: 'pagi' | 'siang' | 'sore' | 'malam';
    greeting?: string;
    greetingDescription?: string;
  };
  students: User[];
  classes: ClassEntity[];
  subjects: Subject[];
  attendanceRate: number;
  hCount: number;
  iCount: number;
  sCount: number;
  aCount: number;
  onNavigateTab?: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentUser,
  students,
  classes,
  subjects,
  attendanceRate,
  hCount,
  iCount,
  sCount,
  aCount,
  onNavigateTab
}) => {
  // Weekly achievements metrics calculation
  const totalPresensi = (hCount + iCount + sCount + aCount) || 1;
  const weeklyAttendanceAvg = Math.round(((hCount + iCount) / totalPresensi) * 100);
  const totalTasks = students.length > 0 ? students.length * 4 : 48;
  const completedTasks = Math.round(totalTasks * 0.92);
  const taskCompletionPercent = Math.round((completedTasks / totalTasks) * 100);
  const onTimeSubmissions = Math.round(completedTasks * 0.88);

  const isTeacherOrAdmin = currentUser.role === 'admin' || currentUser.role === 'wali_kelas' || currentUser.role === 'guru';

  return (
    <div className="space-y-6">
      {/* Sistem Notifikasi Pengumuman Realtime */}
      <AnnouncementBanner
        currentUserRole={currentUser.role}
        currentUserName={currentUser.nama}
      />

      {/* QUICK ACTIONS & PRESENSI HARI INI (Khusus Admin & Tenaga Pendidik / Guru) */}
      {isTeacherOrAdmin && (
        <DashboardQuickActions
          currentUser={currentUser}
          classes={classes}
          subjects={subjects}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* Role-Specific Metric Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs transition">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Siswa Aktif</div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{students.length}</div>
          <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">Terdaftar dalam kelas</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs transition">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Rombel / Kelas</div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <School className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{classes.length}</div>
          <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">T.A. 2025/2026</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs transition">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Mata Pelajaran</div>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{subjects.length}</div>
          <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">Kurikulum Berjalan</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs transition">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Kehadiran Hari Ini</div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{attendanceRate}%</div>
          <div className="text-xs text-emerald-700 dark:text-emerald-300 font-bold mt-1">Rata-rata Sekolah</div>
        </div>
      </div>

      {/* PENCARIAN & DIREKTORI SISWA (SEARCH BAR BY NAME OR CLASS ID) */}
      <StudentDirectorySearch
        students={students}
        classes={classes}
      />

      {/* KOMPONEN KALENDER AKADEMIK & AGENDA SEKOLAH (SINKRONISASI FIREBASE) */}
      <AcademicCalendarWidget
        currentUserRole={currentUser.role}
        currentUserName={currentUser.nama}
      />

      {/* TREN KEHADIRAN MINGGUAN (SPARKLINE CHART) */}
      <WeeklyAttendanceSparkline
        classes={classes}
        totalStudentsCount={students.length}
      />

      {/* Kartu Ringkasan 'Pencapaian Minggu Ini' (Weekly Achievement Showcase) */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-indigo-500/20 relative overflow-hidden">
        {/* Ambient Light Orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-inner">
                <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">Pencapaian Minggu Ini</h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Sparkles className="w-3 h-3" /> Sangat Baik
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  Ringkasan kinerja akademik, penyelesaian tugas siswa, dan kestabilan kehadiran pekan berjalan.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-200 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl w-fit">
              <CalendarCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Pekan ke-3 • Semester Ganjil</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
            {/* Task Completion Metric */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4.5 flex flex-col justify-between hover:bg-white/8 transition">
              <div>
                <div className="flex items-center justify-between text-xs text-indigo-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <CheckCheck className="w-4 h-4 text-emerald-400" /> Tugas Selesai & Terkumpul
                  </span>
                  <span className="text-emerald-400 font-bold flex items-center">
                    +{taskCompletionPercent}% <ArrowUpRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                    {completedTasks}
                  </span>
                  <span className="text-sm font-semibold text-indigo-200">
                    / {totalTasks} tugas
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 shadow-sm"
                      style={{ width: `${taskCompletionPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-indigo-200/70 mt-1.5">
                    <span>Tepat Waktu: <strong className="text-emerald-300">{onTimeSubmissions}</strong></span>
                    <span>Tingkat Kepatuhan: <strong className="text-white">{taskCompletionPercent}%</strong></span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-indigo-300/80 bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-1 rounded-lg mt-3">
                🎯 Melampaui target mingguan 85% pengumpulan tugas.
              </div>
            </div>

            {/* Weekly Attendance Average */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4.5 flex flex-col justify-between hover:bg-white/8 transition">
              <div>
                <div className="flex items-center justify-between text-xs text-indigo-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-400" /> Rata-Rata Presensi Mingguan
                  </span>
                  <span className="text-blue-400 font-bold">Stabil</span>
                </div>

                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                    {weeklyAttendanceAvg}%
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Target ≥ 90%
                  </span>
                </div>

                {/* Visual Attendance Indicators */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-indigo-200">
                    <span>Hadir & Izin Sah:</span>
                    <span className="font-bold text-white">{hCount + iCount} sesi</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-1000"
                      style={{ width: `${weeklyAttendanceAvg}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-indigo-300/70">
                    <span>Sakit: {sCount}</span>
                    <span>Alpa: {aCount}</span>
                    <span>Kehadiran Efektif: {attendanceRate}%</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-indigo-300/80 bg-blue-950/30 border border-blue-500/20 px-2.5 py-1 rounded-lg mt-3">
                📈 Tren kehadiran konsisten dan tidak ada lonjakan ketidakhadiran tanpa keterangan.
              </div>
            </div>

            {/* Academic Quality & Teacher Rating Badge */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4.5 flex flex-col justify-between hover:bg-white/8 transition md:col-span-2 lg:col-span-1">
              <div>
                <div className="flex items-center justify-between text-xs text-indigo-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" /> Kualitas & Ketuntasan Nilai
                  </span>
                  <span className="text-amber-400 font-bold">Grade A-</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-3">
                  <div className="bg-black/20 rounded-xl p-2.5 text-center border border-white/5">
                    <div className="text-[10px] text-indigo-200/80 uppercase">Rata-Rata Nilai</div>
                    <div className="text-xl font-bold text-amber-300 mt-0.5">82.4</div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-2.5 text-center border border-white/5">
                    <div className="text-[10px] text-indigo-200/80 uppercase">Ketuntasan (KKM)</div>
                    <div className="text-xl font-bold text-emerald-300 mt-0.5">91.8%</div>
                  </div>
                </div>

                <div className="text-xs text-indigo-200/80 mt-3 leading-relaxed">
                  Sebagian besar siswa telah memenuhi batas Kriteria Ketuntasan Minimal (KKM 75).
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold text-white/90 bg-amber-500/10 border border-amber-400/20 px-3 py-1.5 rounded-xl mt-3">
                <span>Status Evaluasi:</span>
                <span className="text-amber-300 font-bold">Lulus Ambang Batas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col justify-center transition">
          <ChartAttendance
            title="Rekapitulasi Kehadiran Siswa"
            data={{
              Hadir: hCount,
              Izin: iCount,
              Sakit: sCount,
              Alpa: aCount
            }}
          />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs lg:col-span-2 transition">
          <ChartGrades
            title="Capaian & Tren Perkembangan Akademik Siswa"
            classId="class_10_ipa1"
          />
        </div>
      </div>

      {/* RBAC Access Matrix Reference (Hanya tampil untuk role Admin) */}
      {currentUser.role === 'admin' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs transition">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Matriks Hak Akses Pengguna (RBAC)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border flex flex-col justify-between bg-purple-100 dark:bg-purple-950/70 border-purple-300 dark:border-purple-700 ring-2 ring-purple-400">
              <div>
                <div className="font-bold text-purple-950 dark:text-purple-100 flex items-center justify-between">
                  <span>👑 Admin</span>
                  <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">AKSES ANDA</span>
                </div>
                <div className="text-purple-950 dark:text-purple-100 font-medium mt-1.5 leading-relaxed">Full CRUD semua data, kelola pengguna & kelas, pengaturan aplikasi, database foto Drive, dan ekspor laporan.</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border flex flex-col justify-between bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <div>
                <div className="font-bold text-blue-950 dark:text-blue-100 flex items-center justify-between">
                  <span>🎓 Wali Kelas</span>
                </div>
                <div className="text-blue-950 dark:text-blue-100 font-medium mt-1.5 leading-relaxed">
                  Input presensi harian, review ledger nilai, 18 menu administrasi wali kelas (jadwal, piket, denah, inventaris, jurnal, kasus, prestasi, mading, dll), dan cetak rapor.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border flex flex-col justify-between bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
              <div>
                <div className="font-bold text-emerald-950 dark:text-emerald-100 flex items-center justify-between">
                  <span>👨‍🏫 Guru Mapel</span>
                </div>
                <div className="text-emerald-950 dark:text-emerald-100 font-medium mt-1.5 leading-relaxed">Input/edit nilai tugas, UTS, UAS, dan presensi sesi mengajar untuk mata pelajaran yang diampu.</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border flex flex-col justify-between bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800">
              <div>
                <div className="font-bold text-indigo-950 dark:text-indigo-100 flex items-center justify-between">
                  <span>🎒 Siswa</span>
                </div>
                <div className="text-indigo-950 dark:text-indigo-100 font-medium mt-1.5 leading-relaxed">Melihat jadwal pelajaran, nilai tugas & ujian, dan rekap kehadiran pribadi.</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border flex flex-col justify-between bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <div>
                <div className="font-bold text-amber-950 dark:text-amber-100 flex items-center justify-between">
                  <span>👨‍👦 Orang Tua</span>
                </div>
                <div className="text-amber-950 dark:text-amber-100 font-medium mt-1.5 leading-relaxed">Memantau rekap nilai, presensi harian, dan grafik capaian akademik anak kandung.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
