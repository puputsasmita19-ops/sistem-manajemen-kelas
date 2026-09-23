import React, { useState } from 'react';
import { DatabaseService } from '../services/databaseService';
import { realtimeNotificationService } from '../services/realtimeNotificationService';
import { homeroomService } from '../services/homeroomService';
import { HomeroomPdfExporter } from '../services/homeroomPdfExporter';
import { User, Attendance } from '../types';
import { ChartAttendance } from './ChartAttendance';
import { ChartGrades } from './ChartGrades';
import { StudentSelfieAttendanceModal } from './StudentSelfieAttendanceModal';
import { StudentQRScannerModal } from './StudentQRScannerModal';
import { AttendanceProofViewerModal } from './AttendanceProofViewerModal';
import {
  Download,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Users,
  Camera,
  MapPin,
  Clock,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ExternalLink,
  Eye,
  RotateCcw,
  QrCode,
  CreditCard,
  FileText,
  DollarSign
} from 'lucide-react';

interface StudentPortalProps {
  currentUser: User;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ currentUser }) => {
  const dbService = DatabaseService.getInstance();
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

  const [showSelfieModal, setShowSelfieModal] = useState<boolean>(false);
  const [showQRScanModal, setShowQRScanModal] = useState<boolean>(false);
  const [selectedProofAttendance, setSelectedProofAttendance] = useState<Attendance | null>(null);

  const report = dbService.getStudentReport(targetStudentId);

  if (!report) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-600 dark:text-slate-300">
        Data siswa belum terhubung dengan kelas atau akun.
      </div>
    );
  }

  const { student, studentClass, waliKelas, gradeDetails, attendanceSummary } = report;
  const todayAttendance = dbService.getStudentTodayAttendance(targetStudentId);
  const studentAttendanceRecords = dbService.getStudentAttendanceSummary(targetStudentId).records;

  const handleDownloadPDF = () => {
    realtimeNotificationService.notifyActionSuccess(
      'Mengunduh Rapor Siswa',
      `File rapor digital ${student.nama} sedang disiapkan dan diunduh ke perangkat Anda.`
    );
    dbService.exportStudentReportPDF(targetStudentId);
  };

  // School Fee & Administration data for current student
  const classId = studentClass?.id || 'class_10_ipa1';
  const { doc: feeDoc, record: feeRecord } = homeroomService.getStudentFeeRecord(
    classId,
    targetStudentId,
    student.nama
  );

  const sppTotal =
    ((feeRecord?.spp as any)?.juli || 0) +
    ((feeRecord?.spp as any)?.agustus || 0) +
    ((feeRecord?.spp as any)?.september || 0) +
    ((feeRecord?.spp as any)?.oktober || 0) +
    ((feeRecord?.spp as any)?.november || 0) +
    ((feeRecord?.spp as any)?.desember || 0) +
    ((feeRecord?.spp as any)?.januari || 0) +
    ((feeRecord?.spp as any)?.februari || 0) +
    ((feeRecord?.spp as any)?.maret || 0) +
    ((feeRecord?.spp as any)?.april || 0) +
    ((feeRecord?.spp as any)?.mei || 0) +
    ((feeRecord?.spp as any)?.juni || 0);

  const totalKewajiban =
    (feeRecord?.tagihanKelasX || 0) +
    (feeRecord?.asrama || 0) +
    (feeRecord?.ptsPas || 0) +
    (feeRecord?.buku || 0) +
    (feeRecord?.praktikum || 0) +
    (feeRecord?.kesiswaan || 0) +
    sppTotal;

  const handleDownloadFeeReport = () => {
    realtimeNotificationService.notifyActionSuccess(
      'Mencetak Rincian Administrasi',
      `Surat tagihan & bukti perkembangan administrasi ananda ${student.nama} sedang diproses.`
    );
    HomeroomPdfExporter.exportSingleStudentFeeReport(
      feeDoc,
      feeRecord,
      studentClass?.nama_kelas || 'Kelas X MIPA 1'
    );
  };

  return (
    <div className="space-y-6">
      {/* If Parent has multiple children, show compact Child Selector */}
      {isParent && children.length > 1 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-700/60 p-3.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
            <Users className="w-4 h-4" />
            <span>Pilih Data Anak:</span>
          </div>
          <select
            value={selectedChildId}
            onChange={e => setSelectedChildId(e.target.value)}
            className="bg-amber-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-1.5 text-xs text-amber-950 dark:text-amber-100 font-bold focus:ring-2 focus:ring-amber-500"
          >
            {children.map(c => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* REALTIME ATTENDANCE HERO WIDGET (GPS & SELFIE WITH TIMESTAMP) */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-blue-600/30 relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-xs text-blue-100 border border-white/20 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Presensi Realtime Anti-Kecurangan
              </span>
              <span className="text-[11px] text-blue-200 font-medium">
                Hari ini, {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {isParent
                ? `Status Kehadiran Realtime Ananda ${student.nama}`
                : 'Presensi Masuk Harian (Selfie & Validasi Peta GPS)'}
            </h2>

            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              {isParent
                ? todayAttendance
                  ? `Ananda telah tercatat hadir pada pukul ${todayAttendance.timestamp || '07:15 WIB'} dengan verifikasi foto selfie dan lokasi radius sekolah.`
                  : `Ananda ${student.nama} belum tercatat melakukan presensi masuk di sekolah hari ini.`
                : todayAttendance
                ? `Presensi Anda telah sukses terverifikasi pada pukul ${todayAttendance.timestamp || '07:15 WIB'} (${todayAttendance.isWithinRadius !== false ? 'Dalam Radius Sekolah' : 'Luar Radius'}).`
                : 'Lakukan presensi kilat 1-Tap dengan kamera selfie dan validasi geofence sekolah otomatis.'}
            </p>
          </div>

          {/* Quick Action / Status Badge */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
            {todayAttendance ? (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 w-full sm:w-auto">
                {todayAttendance.photoUrl ? (
                  <div
                    onClick={() => setSelectedProofAttendance(todayAttendance)}
                    className="w-14 h-14 rounded-xl overflow-hidden bg-black border border-white/30 cursor-pointer shrink-0 shadow-md group relative"
                    title="Klik untuk memperbesar bukti selfie"
                  >
                    <img
                      src={todayAttendance.photoUrl}
                      alt="Selfie"
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-emerald-500/30 border border-emerald-400/40 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-emerald-300" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Hadir Terverifikasi</span>
                  </div>
                  <div className="text-xs text-white font-mono mt-0.5">
                    Pukul: <strong>{todayAttendance.timestamp || '07:15 WIB'}</strong>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedProofAttendance(todayAttendance)}
                      className="text-[11px] font-bold text-blue-200 hover:text-white underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Bukti Stempel & Peta
                    </button>
                    {!isParent && (
                      <button
                        type="button"
                        onClick={() => setShowSelfieModal(true)}
                        className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Ambil Ulang
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : !isParent ? (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  id="btn-open-qr-scanner-student"
                  onClick={() => setShowQRScanModal(true)}
                  className="w-full sm:w-auto px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 transition transform active:scale-98 cursor-pointer"
                >
                  <QrCode className="w-5 h-5 text-white" />
                  <span>SCAN QR PROYEKTOR GURU</span>
                </button>

                <button
                  type="button"
                  id="btn-open-selfie-attendance"
                  onClick={() => setShowSelfieModal(true)}
                  className="w-full sm:w-auto px-5 py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition transform active:scale-98 cursor-pointer"
                >
                  <Zap className="w-5 h-5 text-slate-950 fill-current" />
                  <span>PRESENSI SELFIE</span>
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 bg-rose-500/20 border border-rose-400/30 rounded-2xl text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
                <span>Belum ada data presensi masuk ananda hari ini.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Profile & Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">
              {isParent ? 'Laporan Perkembangan Akademik Siswa' : 'Kartu Hasil Belajar Siswa'}
            </div>
            {isParent && (
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{student.nama}</h2>
            )}
            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 mt-2 flex-wrap">
              <span>Kelas: <strong className="text-slate-800 dark:text-slate-100">{studentClass?.nama_kelas || '-'}</strong></span>
              <span>•</span>
              <span>Tahun Ajaran: <strong className="text-slate-800 dark:text-slate-100">{studentClass?.tahun_ajaran || '2025/2026'}</strong></span>
              <span>•</span>
              <span>Wali Kelas: <strong className="text-slate-800 dark:text-slate-100">{waliKelas?.nama || '-'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isParent && (
              <>
                <button
                  type="button"
                  onClick={() => setShowQRScanModal(true)}
                  className="px-4 py-2.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-2 transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  Scan QR Guru
                </button>

                <button
                  type="button"
                  onClick={() => setShowSelfieModal(true)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl flex items-center gap-2 transition cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Presensi Selfie
                </button>
              </>
            )}

            <button
              id="btn-download-rapor"
              onClick={handleDownloadPDF}
              className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Unduh Rapor PDF
            </button>
          </div>
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

      {/* TABEL RIWAYAT PRESENSI DENGAN BUKTI SELFIE & STEMPEL */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Riwayat Presensi & Log Validasi GPS Siswa</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total {studentAttendanceRecords.length} Catatan Presensi
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-300">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Waktu Presensi</th>
                <th className="py-3 px-4">Validasi GPS / Radius</th>
                <th className="py-3 px-4 text-center">Bukti Selfie</th>
                <th className="py-3 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              {studentAttendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                    Belum ada riwayat presensi tercatat.
                  </td>
                </tr>
              ) : (
                studentAttendanceRecords.map((item, idx) => {
                  let statusBadge = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
                  let statusLabel = 'Alpa (A)';
                  if (item.status === 'H') {
                    statusBadge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
                    statusLabel = 'Hadir (H)';
                  } else if (item.status === 'I') {
                    statusBadge = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
                    statusLabel = 'Izin (I)';
                  } else if (item.status === 'S') {
                    statusBadge = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
                    statusLabel = 'Sakit (S)';
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {item.date}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${statusBadge}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {item.timestamp || '07:15 WIB'}
                      </td>
                      <td className="py-3 px-4">
                        {item.distanceMeters !== undefined ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              item.isWithinRadius !== false
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            <MapPin className="w-3 h-3" />
                            <span>{item.distanceMeters}m ({item.isWithinRadius !== false ? 'Radius Valid' : 'Luar Radius'})</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Standar Kelas</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.photoUrl ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProofAttendance(item)}
                            className="p-1 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-[11px] cursor-pointer"
                            title="Lihat Bukti Foto"
                          >
                            <img
                              src={item.photoUrl}
                              alt="Bukti Selfie"
                              className="w-7 h-7 rounded-md object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                            />
                            <span>Lihat</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {item.note || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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

      {/* INFORMASI ADMINISTRASI KEUANGAN & STATUS TAGIHAN SISWA */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-indigo-300">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Rincian Biaya & Perkembangan Administrasi Sekolah</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                  Transparansi
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Data resmi dari Bagian Keuangan & Buku Kendali Wali Kelas ({feeDoc.homeroomTeacherName || 'Wali Kelas'}).
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-download-fee-report-student"
            onClick={handleDownloadFeeReport}
            className="px-3.5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer whitespace-nowrap"
            title="Unduh Surat Rincian Tagihan & Administrasi Individual PDF"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>Unduh Surat Tagihan PDF</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Kewajiban Saat Ini
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {totalKewajiban === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Rp 0 (LUNAS)</span>
                ) : (
                  <span>Rp {totalKewajiban.toLocaleString('id-ID')}</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {feeDoc.dataPerDate || 'Data per Agustus 2026'}
              </div>
            </div>

            <div className="bg-blue-50/70 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/60">
              <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Status SPP Bulanan
              </div>
              <div className="text-sm font-bold text-blue-900 dark:text-blue-100 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Juli & Agustus Terbayar</span>
              </div>
              <div className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">
                September s.d Juni berjalan normal
              </div>
            </div>

            <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60">
              <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Catatan Wali Kelas
              </div>
              <div className="text-xs text-amber-950 dark:text-amber-100 font-medium mt-1 line-clamp-2">
                "{feeRecord?.notes || 'Pembayaran dapat diangsur secara berkala melalui kasir bendahara atau transfer bank.'}"
              </div>
            </div>
          </div>

          {/* Breakdown Grid of specific components */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Buku & Modul LKS</div>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                Rp {(feeRecord?.buku || 0).toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                {feeRecord?.cellStatus?.buku === 'cicil' ? 'Dapat Dicicil' : feeRecord?.buku === 0 ? 'Lunas' : 'Tercatat'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Praktikum & Lab</div>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                Rp {(feeRecord?.praktikum || 0).toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">Bahan Uji Lab</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Penilaian PTS/PAS</div>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                Rp {(feeRecord?.ptsPas || 0).toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">Asesmen Semester</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Kegiatan OSIS/Ekskul</div>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                Rp {(feeRecord?.kesiswaan || 0).toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                {feeRecord?.cellStatus?.kesiswaan === 'cicil' ? 'Dapat Dicicil' : 'Tercatat'}
              </span>
            </div>
          </div>

          {/* Official Bank Account Information */}
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-indigo-900 dark:text-indigo-200">
                Rekening Resmi: {feeDoc.bankName || 'BANK SYARIAH INDONESIA (BSI)'} No. {feeDoc.bankAccountNumber || '4444-400-167'}
              </span>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                a.n. {feeDoc.bankAccountHolder || 'SMK DR SOEBANDI JEMBER'} • Konfirmasi via Bendahara ({feeDoc.receivingTreasurerName || 'Agustin Rahmawati'})
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadFeeReport}
              className="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <FileText className="w-3.5 h-3.5" /> Cetak Bukti & Rincian Lengkap
            </button>
          </div>
        </div>
      </div>

      {/* STUDENT SELFIE ATTENDANCE MODAL */}
      {showSelfieModal && (
        <StudentSelfieAttendanceModal
          currentUser={student}
          onClose={() => setShowSelfieModal(false)}
          onSuccess={() => {
            setShowSelfieModal(false);
          }}
        />
      )}

      {/* STUDENT QR SCANNER (GURU DYNAMIC QR) MODAL */}
      {showQRScanModal && (
        <StudentQRScannerModal
          isOpen={showQRScanModal}
          currentUser={student}
          onClose={() => setShowQRScanModal(false)}
          onSuccess={() => {
            setShowQRScanModal(false);
          }}
        />
      )}

      {/* ATTENDANCE PROOF VIEWER MODAL */}
      {selectedProofAttendance && (
        <AttendanceProofViewerModal
          attendance={selectedProofAttendance}
          studentName={student.nama}
          classNameTitle={studentClass?.nama_kelas}
          onClose={() => setSelectedProofAttendance(null)}
        />
      )}
    </div>
  );
};

