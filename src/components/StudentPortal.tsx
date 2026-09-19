import React, { useState } from 'react';
import { DatabaseService } from '../services/databaseService';
import { User } from '../types';
import { ChartAttendance } from './ChartAttendance';
import { ChartGrades } from './ChartGrades';
import { Download, BookOpen, CheckCircle, Calendar, AlertCircle, HeartHandshake, Clock } from 'lucide-react';
import { useRealtimeClock } from '../utils/timeUtils';

interface StudentPortalProps {
  currentUser: User;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ currentUser }) => {
  const dbService = DatabaseService.getInstance();
  const clock = useRealtimeClock();
  const isParent = currentUser.role === 'orang_tua';

  // Determine active student
  let targetStudentId = currentUser.id;
  const children = isParent ? dbService.getChildrenOfParent(currentUser.id) : [];
  const [selectedChildId, setSelectedChildId] = useState<string>(
    children[0]?.id || ''
  );

  if (isParent) {
    targetStudentId = selectedChildId || (children[0]?.id || '');
  }

  const report = dbService.getStudentReport(targetStudentId);

  if (!report) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-600 dark:text-slate-300">
        Data siswa belum terhubung dengan kelas atau akun.
      </div>
    );
  }

  const { student, studentClass, waliKelas, gradeDetails, attendanceSummary } = report;

  const handleDownloadPDF = () => {
    dbService.exportStudentReportPDF(targetStudentId);
  };

  return (
    <div className="space-y-6">
      {/* If Parent, Show Child Selector */}
      {isParent && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <HeartHandshake className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <div>
              <span className="font-bold text-sm">Portal Wali Murid:</span> Memantau perkembangan akademik anak kandung.
            </div>
          </div>
          {children.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Pilih Anak:</span>
              <select
                value={selectedChildId}
                onChange={e => setSelectedChildId(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-1.5 text-xs text-amber-950 dark:text-amber-100 font-bold focus:ring-2 focus:ring-amber-500"
              >
                {children.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nama}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Student Profile & Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">
              {isParent ? 'Laporan Perkembangan Akademik Siswa' : 'Kartu Hasil Belajar Siswa'}
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{student.nama}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-extrabold text-xs">
                {isParent ? '👨‍👦 Akses: Orang Tua' : '🎒 Akses: Siswa'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-medium">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                {clock.dateFormatted}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                {clock.timeFormatted} WIB
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 mt-2 flex-wrap">
              <span>Kelas: <strong className="text-slate-800 dark:text-slate-100">{studentClass?.nama_kelas || '-'}</strong></span>
              <span>•</span>
              <span>Tahun Ajaran: <strong className="text-slate-800 dark:text-slate-100">{studentClass?.tahun_ajaran || '2025/2026'}</strong></span>
              <span>•</span>
              <span>Wali Kelas: <strong className="text-slate-800 dark:text-slate-100">{waliKelas?.nama || '-'}</strong></span>
            </div>
          </div>

          <button
            id="btn-download-rapor"
            onClick={handleDownloadPDF}
            className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl flex items-center gap-2 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            Unduh Rapor PDF
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Presensi Hadir</div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">{attendanceSummary.H} <span className="text-xs font-normal">Hari</span></div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="text-xs font-medium text-blue-800 dark:text-blue-300">Izin Resmi</div>
          <div className="text-2xl font-black text-blue-900 dark:text-blue-100 mt-1">{attendanceSummary.I} <span className="text-xs font-normal">Hari</span></div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="text-xs font-medium text-amber-800 dark:text-amber-300">Sakit (Keterangan)</div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-1">{attendanceSummary.S} <span className="text-xs font-normal">Hari</span></div>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
          <div className="text-xs font-medium text-rose-800 dark:text-rose-300">Alpa (Tanpa Ket.)</div>
          <div className="text-2xl font-black text-rose-900 dark:text-rose-100 mt-1">{attendanceSummary.A} <span className="text-xs font-normal">Hari</span></div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex flex-col justify-center transition-colors">
          <ChartAttendance
            title="Persentase Kehadiran"
            data={{
              Hadir: attendanceSummary.H,
              Izin: attendanceSummary.I,
              Sakit: attendanceSummary.S,
              Alpa: attendanceSummary.A
            }}
          />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm lg:col-span-2 transition-colors">
          <ChartGrades
            title="Grafik Capaian Nilai per Mata Pelajaran"
            labels={gradeDetails.map(g => g.subjectName)}
            tugas={gradeDetails.map(g => g.tugas)}
            uts={gradeDetails.map(g => g.uts)}
            uas={gradeDetails.map(g => g.uas)}
            finalScores={gradeDetails.map(g => g.finalScore)}
          />
        </div>
      </div>

      {/* Grade Details Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Transkrip Nilai Akademik
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Nilai Akhir = Tugas (30%) + UTS (30%) + UAS (40%)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-300">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4 text-center">Tugas (30%)</th>
                <th className="py-3 px-4 text-center">UTS (30%)</th>
                <th className="py-3 px-4 text-center">UAS (40%)</th>
                <th className="py-3 px-4 text-center">Nilai Akhir</th>
                <th className="py-3 px-4 text-center">Predikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {gradeDetails.map((item, idx) => {
                let badgeColor = 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
                if (item.predicate === 'A') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
                if (item.predicate === 'B') badgeColor = 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
                if (item.predicate === 'C') badgeColor = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';

                return (
                  <tr key={item.subjectId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                    <td className="py-3 px-4 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      {item.subjectName}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-800 dark:text-slate-200">{item.tugas}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-800 dark:text-slate-200">{item.uts}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-800 dark:text-slate-200">{item.uas}</td>
                    <td className="py-3 px-4 text-center font-mono font-black text-slate-900 dark:text-white">{item.finalScore}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColor}`}>
                        {item.predicate}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
