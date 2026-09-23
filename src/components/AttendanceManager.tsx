import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/databaseService';
import { realtimeNotificationService } from '../services/realtimeNotificationService';
import { AttendanceStatus, ClassEntity, Subject, User, Attendance } from '../types';
import Swal from 'sweetalert2';
import {
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Save,
  RefreshCw,
  Calendar,
  BookOpen,
  Users,
  QrCode,
  FileText,
  Sparkles,
  Camera,
  MapPin,
  Clock,
  ShieldCheck,
  Eye,
  List,
  Search,
  CalendarRange,
  Filter,
  X,
  Layers
} from 'lucide-react';
import { QRScannerSection } from './QRScannerSection';
import { DynamicQRAttendanceModal } from './DynamicQRAttendanceModal';
import { AttendanceProofViewerModal } from './AttendanceProofViewerModal';
import { Pagination } from './Pagination';

interface AttendanceManagerProps {
  currentRole: string;
  currentUserId: string;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({ currentRole, currentUserId }) => {
  const dbService = DatabaseService.getInstance();
  const classes = dbService.getAllClasses();
  const subjects = dbService.getAllSubjects();

  // Determine default class
  const homeroom = dbService.getHomeroomClass(currentUserId);
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('SIMAK_ATTENDANCE_CLASS_ID');
      if (saved && classes.some(c => c.id === saved)) return saved;
    } catch (e) {}
    return homeroom ? homeroom.id : (classes[0]?.id || '');
  });

  const teacherSubjects = dbService.getSubjectsByTeacher(currentUserId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('SIMAK_ATTENDANCE_SUBJECT_ID');
      if (saved && subjects.some(s => s.id === saved)) return saved;
    } catch (e) {}
    return teacherSubjects[0]?.id || (subjects[0]?.id || '');
  });

  useEffect(() => {
    try {
      if (selectedClassId) localStorage.setItem('SIMAK_ATTENDANCE_CLASS_ID', selectedClassId);
    } catch (e) {}
  }, [selectedClassId]);

  useEffect(() => {
    try {
      if (selectedSubjectId) localStorage.setItem('SIMAK_ATTENDANCE_SUBJECT_ID', selectedSubjectId);
    } catch (e) {}
  }, [selectedSubjectId]);

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr.substring(0, 7)); // 'YYYY-MM'
  const [showQRScanner, setShowQRScanner] = useState<boolean>(false);
  const [showDynamicQRModal, setShowDynamicQRModal] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'selfie_gallery'>('table');
  const [selectedProofAttendance, setSelectedProofAttendance] = useState<{
    attendance: Attendance;
    studentName: string;
  } | null>(null);

  // Filter Tanggal & Nama Siswa
  const [dateFilterMode, setDateFilterMode] = useState<'single' | 'range'>('single');
  const [searchStudentName, setSearchStudentName] = useState<string>('');
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(sevenDaysAgo);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [rangeStatusFilter, setRangeStatusFilter] = useState<string>('all');

  const [studentRows, setStudentRows] = useState<
    {
      studentId: string;
      nama: string;
      no_wa: string;
      status: AttendanceStatus;
      attendanceRec?: Attendance | null;
    }[]
  >([]);

  const selectedClassObj = dbService.getClassById(selectedClassId);
  const classStudents = dbService.getClassStudents(selectedClassId);

  const loadData = () => {
    if (!selectedClassId) return;
    const records = dbService.getAttendanceByClassAndDate(selectedClassId, selectedDate, selectedSubjectId);
    const enriched = records.map(r => {
      const fullRec = dbService.getStudentTodayAttendance(r.studentId, selectedDate);
      return {
        ...r,
        attendanceRec: fullRec
      };
    });
    setStudentRows(enriched);
  };

  useEffect(() => {
    loadData();
  }, [selectedClassId, selectedDate, selectedSubjectId]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudentRows(prev =>
      prev.map(row => (row.studentId === studentId ? { ...row, status } : row))
    );
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setStudentRows(prev => prev.map(row => ({ ...row, status })));
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: `Semua siswa ditandai ${status === 'H' ? 'Hadir' : status === 'I' ? 'Izin' : status === 'S' ? 'Sakit' : 'Alpa'}`,
      showConfirmButton: false,
      timer: 1500
    });
  };

  const handleSave = () => {
    try {
      dbService.saveBulkAttendance(
        selectedClassId,
        selectedSubjectId,
        selectedDate,
        studentRows.map(r => ({ studentId: r.studentId, status: r.status }))
      );

      Swal.fire({
        icon: 'success',
        title: 'Presensi Tersimpan!',
        text: `Data presensi untuk ${studentRows.length} siswa berhasil disimpan ke Firebase Realtime Database.`,
        timer: 1800,
        showConfirmButton: false
      });
      loadData();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan sistem.'
      });
    }
  };

  const handleExportPDF = () => {
    realtimeNotificationService.notifyActionSuccess(
      'Mengunduh Rekap Harian',
      `Dokumen PDF presensi tanggal ${selectedDate} sedang diproses untuk diunduh.`
    );
    dbService.exportAttendancePDF(selectedClassId, selectedDate, selectedSubjectId);
  };

  const handleExportMonthlyReport = () => {
    realtimeNotificationService.notifyActionSuccess(
      'Mengunduh Rekap Bulanan',
      `Laporan bulanan presensi format resmi (${selectedMonth}) sedang disiapkan.`
    );
    dbService.exportMonthlyAttendanceReportPDF(selectedClassId, selectedMonth);
  };

  const handleQRStudentScanned = (studentId: string, nama: string) => {
    handleStatusChange(studentId, 'H');

    // Auto-save instantly to DB
    const updated = studentRows.map(r => ({
      studentId: r.studentId,
      status: r.studentId === studentId ? ('H' as AttendanceStatus) : r.status
    }));
    dbService.saveBulkAttendance(selectedClassId, selectedSubjectId, selectedDate, updated);

    // Audit log for Activity Log module
    const timeStr = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    dbService.logActivity(
      'qr_attendance_scan',
      'Scan QR Code Presensi Siswa',
      `Siswa ${nama} (${studentId}) berhasil dipindai Hadir (H) via Pemindai QR Guru untuk Kelas ${selectedClassObj?.nama_kelas || 'Kelas'} pada ${timeStr} WIB.`,
      `att_${selectedClassId}_${selectedDate}_${studentId}`,
      {
        studentId,
        studentName: nama,
        classId: selectedClassId,
        className: selectedClassObj?.nama_kelas,
        subjectId: selectedSubjectId,
        date: selectedDate,
        scannedAt: timeStr,
        status: 'H',
        method: 'Pemindai QR Guru'
      },
      {
        id: studentId,
        nama,
        role: 'siswa'
      }
    );

    realtimeNotificationService.notifyActionSuccess(
      'Presensi QR Sukses',
      `${nama} berhasil tercatat Hadir (H).`,
      true
    );
  };

  // Quick stats
  const totalStudents = studentRows.length;
  const countH = studentRows.filter(r => r.status === 'H').length;
  const countI = studentRows.filter(r => r.status === 'I').length;
  const countS = studentRows.filter(r => r.status === 'S').length;
  const countA = studentRows.filter(r => r.status === 'A').length;

  // Filtered student rows in single-day mode by student name / NIS
  const filteredSingleRows = studentRows.filter(r => {
    if (!searchStudentName.trim()) return true;
    const q = searchStudentName.toLowerCase();
    return (
      r.nama.toLowerCase().includes(q) ||
      r.studentId.toLowerCase().includes(q) ||
      (r.no_wa && r.no_wa.includes(q))
    );
  });

  // Range records when in date range mode
  const rangeRecords = (dateFilterMode === 'range' && selectedClassId)
    ? dbService.getAttendanceByClassAndDateRange(selectedClassId, startDate, endDate, selectedSubjectId)
    : [];

  const filteredRangeRecords = rangeRecords.filter(r => {
    const matchName = !searchStudentName.trim() ||
      r.nama.toLowerCase().includes(searchStudentName.toLowerCase()) ||
      (r.nis && r.nis.toLowerCase().includes(searchStudentName.toLowerCase())) ||
      r.studentId.toLowerCase().includes(searchStudentName.toLowerCase());
    const matchStatus = rangeStatusFilter === 'all' || r.status === rangeStatusFilter;
    return matchName && matchStatus;
  });

  // Range stats
  const totalRangeCount = filteredRangeRecords.length;
  const rangeH = filteredRangeRecords.filter(r => r.status === 'H').length;
  const rangeI = filteredRangeRecords.filter(r => r.status === 'I').length;
  const rangeS = filteredRangeRecords.filter(r => r.status === 'S').length;
  const rangeA = filteredRangeRecords.filter(r => r.status === 'A').length;
  const rangeRate = totalRangeCount > 0 ? Math.round((rangeH / totalRangeCount) * 100) : 0;

  // Range Pagination
  const [rangeCurrentPage, setRangeCurrentPage] = useState(1);
  const [rangeItemsPerPage, setRangeItemsPerPage] = useState(25);

  useEffect(() => {
    setRangeCurrentPage(1);
  }, [startDate, endDate, selectedClassId, selectedSubjectId, searchStudentName, rangeStatusFilter]);

  const validRangePage = Math.min(
    Math.max(1, rangeCurrentPage),
    Math.max(1, Math.ceil(filteredRangeRecords.length / rangeItemsPerPage))
  );

  const paginatedRangeRecords = filteredRangeRecords.slice(
    (validRangePage - 1) * rangeItemsPerPage,
    validRangePage * rangeItemsPerPage
  );

  const handleExportRangeCSV = () => {
    if (filteredRangeRecords.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Data Kosong',
        text: 'Tidak ada data presensi pada rentang tanggal yang dipilih.'
      });
      return;
    }
    const headers = ['No', 'Tanggal', 'Nama Siswa', 'NIS', 'Kelas', 'Mata Pelajaran', 'Waktu', 'Status', 'Catatan'];
    const rows = filteredRangeRecords.map((r, i) => [
      i + 1,
      r.date,
      `"${r.nama}"`,
      r.nis || '-',
      `"${selectedClassObj?.nama_kelas || '-'}"`,
      `"${subjects.find(s => s.id === r.subject_id)?.nama_mapel || '-'}"`,
      r.timestamp || '-',
      r.status === 'H' ? 'Hadir' : r.status === 'I' ? 'Izin' : r.status === 'S' ? 'Sakit' : 'Alpa',
      `"${r.notes || '-'}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Presensi_Rentang_${selectedClassObj?.nama_kelas || 'Kelas'}_${startDate}_sd_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Manajemen Presensi Harian (Bulk Input & QR Scanner)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Catat dan verifikasi kehadiran seluruh siswa per kelas dengan input manual atau scan kartu QR otomatis.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            {/* Toggle View Mode: Tabel vs Galeri Selfie */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Tabel</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('selfie_gallery')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'selfie_gallery'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-indigo-500" />
                <span>Foto Selfie ({studentRows.filter(r => r.attendanceRec?.photoUrl).length})</span>
              </button>
            </div>

            {/* Dynamic QR Code Generator & Projector Button */}
            <button
              id="btn-open-dynamic-qr"
              type="button"
              onClick={() => setShowDynamicQRModal(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer flex-1 sm:flex-initial bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
              title="Buat QR Code Presensi Dinamis Kelas dengan batas waktu (misal: 5 menit)"
            >
              <Clock className="w-4 h-4 text-amber-300" />
              <span>QR Dinamis (Batas Waktu)</span>
            </button>

            {/* Toggle Mode QR Scanner */}
            <button
              id="btn-toggle-qr-scanner"
              type="button"
              onClick={() => setShowQRScanner(!showQRScanner)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer flex-1 sm:flex-initial ${
                showQRScanner
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{showQRScanner ? 'Tutup Scanner' : 'Scanner QR'}</span>
            </button>

            {/* Monthly Report PDF Trigger */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600 flex-1 sm:flex-initial">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none px-1.5 cursor-pointer w-full sm:w-auto"
                title="Pilih Bulan Rekapitulasi"
              />
              <button
                id="btn-export-monthly-pdf"
                onClick={handleExportMonthlyReport}
                className="px-2.5 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-900 dark:hover:bg-black rounded-lg flex items-center gap-1 transition shadow-xs whitespace-nowrap cursor-pointer"
                title="Cetak Laporan Bulanan Resmi Wali Kelas"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Rekap Bulanan</span>
              </button>
            </div>

            {/* CSV Log Export Button */}
            <button
              id="btn-export-attendance-csv"
              onClick={() => dbService.exportAttendanceLogsToCSV(selectedClassId, selectedMonth)}
              className="px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer flex-1 sm:flex-initial"
              title="Ekspor Seluruh Log Presensi ke CSV Spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>CSV Log</span>
            </button>

            <button
              id="btn-export-attendance-pdf"
              onClick={handleExportPDF}
              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer flex-1 sm:flex-initial"
              title="Ekspor rekap harian hari ini"
            >
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>PDF Harian</span>
            </button>

            <button
              id="btn-save-attendance"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer w-full sm:w-auto"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Presensi</span>
            </button>
          </div>
        </div>

        {/* Mode Switch & Quick Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              id="btn-mode-single-date"
              onClick={() => setDateFilterMode('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                dateFilterMode === 'single'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Input Harian</span>
            </button>
            <button
              type="button"
              id="btn-mode-range-date"
              onClick={() => setDateFilterMode('range')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                dateFilterMode === 'range'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Filter Rentang Tanggal</span>
            </button>
          </div>

          {/* Student Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-search-student-attendance"
              type="text"
              value={searchStudentName}
              onChange={e => setSearchStudentName(e.target.value)}
              placeholder="Filter nama siswa / NIS..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
            />
            {searchStudentName && (
              <button
                type="button"
                onClick={() => setSearchStudentName('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Hapus filter nama"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter bar controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Pilih Kelas
            </label>
            <select
              id="select-attendance-class"
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nama_kelas} ({c.tahun_ajaran})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Mata Pelajaran
            </label>
            <select
              id="select-attendance-subject"
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nama_mapel}
                </option>
              ))}
            </select>
          </div>

          {dateFilterMode === 'single' ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Tanggal Presensi
              </label>
              <input
                id="input-attendance-date"
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Dari Tanggal
                </label>
                <input
                  id="input-attendance-start-date"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Sampai Tanggal
                </label>
                <input
                  id="input-attendance-end-date"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Range Status Filter Pill Bar (only in range mode) */}
        {dateFilterMode === 'range' && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              {[
                { id: 'all', label: 'Semua Status' },
                { id: 'H', label: 'Hadir (H)' },
                { id: 'I', label: 'Izin (I)' },
                { id: 'S', label: 'Sakit (S)' },
                { id: 'A', label: 'Alpa (A)' }
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setRangeStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    rangeStatusFilter === st.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportRangeCSV}
              className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              title="Unduh data presensi pada rentang tanggal terpilih"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor Log Rentang (.csv)</span>
            </button>
          </div>
        )}
      </div>

      {/* QR SCANNER VIEWPORT MODAL/EXPANDED SECTION */}
      {showQRScanner && (
        <QRScannerSection
          classId={selectedClassId}
          classNameTitle={selectedClassObj?.nama_kelas || 'Kelas'}
          students={classStudents}
          onAttendanceMarked={handleQRStudentScanned}
          onClose={() => setShowQRScanner(false)}
          onOpenDynamicQRModal={() => setShowDynamicQRModal(true)}
        />
      )}

      {/* Quick Stat Badges & View Rendering */}
      {dateFilterMode === 'single' ? (
        <>
          {/* Quick Stat Badges & Bulk Shortcuts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Hadir (H)</div>
                <div className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{countH} / {totalStudents}</div>
              </div>
              <button
                onClick={() => handleMarkAll('H')}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 dark:hover:bg-emerald-800 px-2.5 py-1 rounded-md transition cursor-pointer"
                title="Tandai semua siswa hadir"
              >
                Semua H
              </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-blue-800 dark:text-blue-300">Izin (I)</div>
                <div className="text-xl font-bold text-blue-900 dark:text-blue-100">{countI}</div>
              </div>
              <button
                onClick={() => handleMarkAll('I')}
                className="text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white bg-blue-100 dark:bg-blue-900/60 hover:bg-blue-200 dark:hover:bg-blue-800 px-2.5 py-1 rounded-md transition cursor-pointer"
              >
                Semua I
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-amber-800 dark:text-amber-300">Sakit (S)</div>
                <div className="text-xl font-bold text-amber-900 dark:text-amber-100">{countS}</div>
              </div>
              <button
                onClick={() => handleMarkAll('S')}
                className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-white bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800 px-2.5 py-1 rounded-md transition cursor-pointer"
              >
                Semua S
              </button>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-rose-800 dark:text-rose-300">Alpa (A)</div>
                <div className="text-xl font-bold text-rose-900 dark:text-rose-100">{countA}</div>
              </div>
              <button
                onClick={() => handleMarkAll('A')}
                className="text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800 px-2.5 py-1 rounded-md transition cursor-pointer"
              >
                Semua A
              </button>
            </div>
          </div>

          {/* Attendance Multi-Input Table or Gallery */}
          {viewMode === 'table' ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
              <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Daftar Siswa Kelas & Status Kehadiran
                  </span>
                  {searchStudentName && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {filteredSingleRows.length} dari {studentRows.length} siswa
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Format: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Hadir</span>, <span className="font-semibold text-blue-600 dark:text-blue-400">Izin</span>, <span className="font-semibold text-amber-600 dark:text-amber-400">Sakit</span>, <span className="font-semibold text-rose-600 dark:text-rose-400">Alpa</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-300">
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Waktu & GPS</th>
                      <th className="py-3 px-4 text-center">Selfie</th>
                      <th className="py-3 px-4 text-center">Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                    {filteredSingleRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-600 dark:text-slate-300 font-medium">
                          {searchStudentName ? (
                            <div className="space-y-1">
                              <div>Tidak ada siswa yang cocok dengan kata kunci &quot;{searchStudentName}&quot;</div>
                              <button
                                type="button"
                                onClick={() => setSearchStudentName('')}
                                className="text-xs text-blue-600 dark:text-blue-400 underline font-bold cursor-pointer"
                              >
                                Bersihkan Pencarian
                              </button>
                            </div>
                          ) : (
                            'Tidak ada siswa terdaftar pada kelas ini.'
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredSingleRows.map((row, index) => (
                        <tr key={row.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-200 font-mono text-xs font-bold">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                            <div>{row.nama}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 sm:hidden">{row.no_wa}</div>
                          </td>
                          <td className="py-3 px-4">
                            {row.attendanceRec ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                                  <span>{row.attendanceRec.timestamp || '07:15 WIB'}</span>
                                </div>
                                {row.attendanceRec.distanceMeters !== undefined && (
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      row.attendanceRec.isWithinRadius !== false
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                    }`}
                                  >
                                    <MapPin className="w-3 h-3" />
                                    <span>{row.attendanceRec.distanceMeters}m ({row.attendanceRec.isWithinRadius !== false ? 'Dalam Radius' : 'Luar Radius'})</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-mono">Presensi Manual</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {row.attendanceRec?.photoUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedProofAttendance({
                                    attendance: row.attendanceRec!,
                                    studentName: row.nama
                                  })
                                }
                                className="inline-flex items-center gap-1.5 p-1 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition text-blue-600 dark:text-blue-400 font-bold text-xs cursor-pointer"
                                title="Klik untuk melihat bukti foto selfie"
                              >
                                <img
                                  src={row.attendanceRec.photoUrl}
                                  alt="Selfie"
                                  className="w-8 h-8 rounded-lg object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                                />
                                <span className="text-[11px]">Lihat</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                              {(['H', 'I', 'S', 'A'] as AttendanceStatus[]).map(st => {
                                const isSelected = row.status === st;
                                let activeClass = 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600';
                                if (isSelected) {
                                  if (st === 'H') activeClass = 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300 dark:ring-emerald-700';
                                  if (st === 'I') activeClass = 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300 dark:ring-blue-700';
                                  if (st === 'S') activeClass = 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300 dark:ring-amber-700';
                                  if (st === 'A') activeClass = 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300 dark:ring-rose-700';
                                }

                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleStatusChange(row.studentId, st)}
                                    className={`w-9 h-9 sm:w-10 sm:h-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${activeClass}`}
                                    title={`Tandai ${st}`}
                                  >
                                    {st}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className={`p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center ${currentRole !== 'wali_kelas' && currentRole !== 'guru_mapel' ? 'justify-between' : 'justify-end'} gap-3 text-xs text-slate-600 dark:text-slate-300`}>
                {currentRole !== 'wali_kelas' && currentRole !== 'guru_mapel' && (
                  <div>
                    💡 <span className="font-medium">Relasi NoSQL:</span> Nilai status disimpan dalam path <code className="font-mono bg-slate-200 dark:bg-slate-700 dark:text-slate-200 px-1 py-0.5 rounded">/attendance/&#123;pushId&#125;</code> dengan foreign key <code className="font-mono">student_id</code>, <code className="font-mono">class_id</code>, dan <code className="font-mono">subject_id</code>.
                  </div>
                )}
                <button
                  onClick={handleSave}
                  className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Simpan Perubahan
                </button>
              </div>
            </div>
          ) : (
            /* Realtime Selfie Gallery View */
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Galeri Foto Selfie Berstempel Realtime Siswa ({selectedDate})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Foto dilengkapi stempel waktu detik, koordinat GPS, dan watermark integritas data anti-manipulasi.
                  </p>
                </div>
              </div>

              {filteredSingleRows.filter(r => r.attendanceRec?.photoUrl).length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                  <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Presensi Selfie Hari Ini</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Siswa yang melakukan presensi mandiri dengan selfie dan validasi GPS akan langsung tampil di galeri ini secara realtime.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredSingleRows
                    .filter(r => r.attendanceRec?.photoUrl)
                    .map(row => {
                      const rec = row.attendanceRec!;
                      return (
                        <div
                          key={row.studentId}
                          onClick={() =>
                            setSelectedProofAttendance({
                              attendance: rec,
                              studentName: row.nama
                            })
                          }
                          className="group bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden hover:shadow-lg transition cursor-pointer flex flex-col"
                        >
                          <div className="relative aspect-4/3 bg-black overflow-hidden">
                            <img
                              src={rec.photoUrl}
                              alt={`Selfie ${row.nama}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute top-2 right-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md ${
                                  rec.isWithinRadius !== false
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-amber-500 text-white'
                                }`}
                              >
                                {rec.isWithinRadius !== false ? '✓ Dalam Radius' : '⚠️ Luar Radius'}
                              </span>
                            </div>
                            <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-mono text-yellow-300 font-bold">
                              ⏰ {rec.timestamp || '07:15 WIB'}
                            </div>
                          </div>

                          <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2">
                            <div>
                              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {row.nama}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                                <MapPin className="w-3 h-3 text-slate-800 dark:text-slate-200 shrink-0" />
                                <span>{rec.distanceMeters || 0}m • GPS: {rec.latitude?.toFixed(4)}, {rec.longitude?.toFixed(4)}</span>
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                Status: Hadir (H)
                              </span>
                              <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition">
                                <Eye className="w-3 h-3" /> Detail
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* RENTANG TANGGAL (DATE RANGE MODE) VIEW */
        <div className="space-y-4">
          {/* Summary Stat Cards for Selected Date Range */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Log Presensi</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{totalRangeCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{startDate} s/d {endDate}</div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
              <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Hadir (H)</div>
              <div className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{rangeH}</div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">Tingkat Hadir: {rangeRate}%</div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
              <div className="text-xs font-medium text-blue-800 dark:text-blue-300">Izin (I)</div>
              <div className="text-xl font-bold text-blue-900 dark:text-blue-100">{rangeI}</div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">Disetujui</div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <div className="text-xs font-medium text-amber-800 dark:text-amber-300">Sakit (S)</div>
              <div className="text-xl font-bold text-amber-900 dark:text-amber-100">{rangeS}</div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Surat Dokter</div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 col-span-2 sm:col-span-1">
              <div className="text-xs font-medium text-rose-800 dark:text-rose-300">Alpa (A)</div>
              <div className="text-xl font-bold text-rose-900 dark:text-rose-100">{rangeA}</div>
              <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">Tanpa Keterangan</div>
            </div>
          </div>

          {/* Date Range Attendance Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>Log Riwayat Presensi Kelas {selectedClassObj?.nama_kelas || ''}</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    ({startDate} s/d {endDate})
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Menampilkan {filteredRangeRecords.length} entri riwayat presensi
                  {searchStudentName ? ` untuk pencarian "${searchStudentName}"` : ''}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchStudentName}
                    onChange={(e) => setSearchStudentName(e.target.value)}
                    placeholder="Cari nama / NIS siswa..."
                    className="pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none w-48 focus:ring-2 focus:ring-blue-500/20"
                  />
                  {searchStudentName && (
                    <button
                      type="button"
                      onClick={() => setSearchStudentName('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExportRangeCSV}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Unduh CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Mata Pelajaran</th>
                    <th className="py-3 px-4">Waktu & GPS</th>
                    <th className="py-3 px-4 text-center">Selfie</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                  {filteredRangeRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <div className="max-w-sm mx-auto space-y-2">
                          <CalendarRange className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                          <div className="font-bold text-slate-700 dark:text-slate-200">
                            Tidak Ditemukan Data Presensi
                          </div>
                          <p className="text-xs text-slate-500">
                            Tidak ada entri presensi yang cocok untuk kelas ini pada rentang tanggal{' '}
                            <span className="font-semibold">{startDate}</span> s/d{' '}
                            <span className="font-semibold">{endDate}</span>
                            {searchStudentName ? ` dengan nama "${searchStudentName}"` : ''}.
                          </p>
                          {searchStudentName && (
                            <button
                              type="button"
                              onClick={() => setSearchStudentName('')}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              Hapus filter nama siswa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedRangeRecords.map((rec, idx) => {
                      const subjectName = subjects.find(s => s.id === rec.subject_id)?.nama_mapel || 'Mata Pelajaran';
                      let statusBadge = (
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                          {rec.status}
                        </span>
                      );
                      if (rec.status === 'H') {
                        statusBadge = (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Hadir
                          </span>
                        );
                      } else if (rec.status === 'I') {
                        statusBadge = (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            Izin
                          </span>
                        );
                      } else if (rec.status === 'S') {
                        statusBadge = (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Sakit
                          </span>
                        );
                      } else if (rec.status === 'A') {
                        statusBadge = (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            Alpa
                          </span>
                        );
                      }

                      return (
                        <tr key={rec.id || `${rec.studentId}_${rec.date}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                          <td className="py-3 px-4 text-center text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                            {(validRangePage - 1) * rangeItemsPerPage + idx + 1}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            <div className="font-bold">{rec.date}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{rec.nama}</div>
                            {rec.nis && <div className="text-[11px] font-mono text-slate-500">NIS: {rec.nis}</div>}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                            {subjectName}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" />
                              <span>{rec.timestamp || '07:15 WIB'}</span>
                            </div>
                            {rec.location && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-0.5 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-800 dark:text-slate-200" />
                                <span>{rec.location.lat.toFixed(4)}, {rec.location.lng.toFixed(4)}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {rec.photoUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedProofAttendance({
                                    attendance: {
                                      id: rec.id,
                                      student_id: rec.studentId,
                                      class_id: selectedClassId,
                                      subject_id: rec.subject_id,
                                      date: rec.date,
                                      status: rec.status,
                                      timestamp: rec.timestamp,
                                      photoUrl: rec.photoUrl,
                                      location: rec.location,
                                      verified: rec.verified,
                                      notes: rec.notes
                                    },
                                    studentName: rec.nama
                                  })
                                }
                                className="inline-flex items-center gap-1 p-1 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400 font-bold text-xs cursor-pointer"
                              >
                                <img
                                  src={rec.photoUrl}
                                  alt="Selfie"
                                  className="w-7 h-7 rounded-md object-cover border border-slate-300"
                                />
                                <span className="text-[11px]">Lihat</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {statusBadge}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 italic max-w-xs truncate">
                            {rec.notes || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={validRangePage}
              totalItems={filteredRangeRecords.length}
              itemsPerPage={rangeItemsPerPage}
              onPageChange={setRangeCurrentPage}
              onItemsPerPageChange={setRangeItemsPerPage}
              itemsPerPageOptions={[10, 25, 50, 100]}
              itemLabel="log presensi"
            />
          </div>
        </div>
      )}

      {/* PROOF VIEWER MODAL */}
      {selectedProofAttendance && (
        <AttendanceProofViewerModal
          attendance={selectedProofAttendance.attendance}
          studentName={selectedProofAttendance.studentName}
          classNameTitle={selectedClassObj?.nama_kelas}
          onClose={() => setSelectedProofAttendance(null)}
        />
      )}

      {/* DYNAMIC QR ATTENDANCE MODAL / PROJECTOR */}
      {showDynamicQRModal && (
        <DynamicQRAttendanceModal
          isOpen={showDynamicQRModal}
          onClose={() => setShowDynamicQRModal(false)}
          classId={selectedClassId}
          classNameTitle={selectedClassObj?.nama_kelas || 'Kelas'}
          subjectId={selectedSubjectId}
          subjectNameTitle={subjects.find((s) => s.id === selectedSubjectId)?.nama_mapel || 'Mata Pelajaran'}
          selectedDate={selectedDate}
          studentsInClass={classStudents}
          onAttendanceUpdated={() => {
            // Trigger refresh by updating local state
            setSelectedDate(prev => `${prev}`);
          }}
        />
      )}
    </div>
  );
};
