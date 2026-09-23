import React, { useState, useMemo } from 'react';
import {
  Zap,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Save,
  CheckCheck,
  Megaphone,
  Award,
  AlertCircle,
  FileText,
  BookOpen,
  School
} from 'lucide-react';
import { User, ClassEntity, Subject, AttendanceStatus, AnnouncementScope } from '../types';
import { DatabaseService } from '../services/databaseService';
import { QuickActionTooltip } from './QuickActionTooltip';
import Swal from 'sweetalert2';

interface DashboardQuickActionsProps {
  currentUser: User;
  classes: ClassEntity[];
  subjects: Subject[];
  onNavigateTab?: (tab: string) => void;
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({
  currentUser,
  classes,
  subjects,
  onNavigateTab
}) => {
  const dbService = DatabaseService.getInstance();
  const todayStr = new Date().toISOString().split('T')[0];

  // Pick initial class based on user's role/homeroom
  const initialClassId = useMemo(() => {
    if (currentUser.role === 'wali_kelas') {
      const myClass = classes.find(c => c.wali_kelas_id === currentUser.id);
      if (myClass) return myClass.id;
    }
    return classes[0]?.id || '';
  }, [currentUser, classes]);

  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('HOMEROOM');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementCategory, setAnnouncementCategory] = useState<'Penting' | 'Akademik' | 'Kegiatan' | 'Libur'>('Penting');
  const [announcementScope, setAnnouncementScope] = useState<AnnouncementScope>(() => {
    if (currentUser.role === 'wali_kelas') return 'homeroom_to_class';
    if (currentUser.role === 'guru') return 'teacher_to_class';
    return 'school_wide';
  });

  // Roster of students in selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return dbService.getStudentsInClass(selectedClassId);
  }, [dbService, selectedClassId]);

  // Existing attendance map for today
  const existingAttendance = useMemo(() => {
    if (!selectedClassId) return [];
    return dbService.getAttendanceByClassAndDate(selectedClassId, todayStr, selectedSubjectId);
  }, [dbService, selectedClassId, todayStr, selectedSubjectId]);

  // Working state for quick attendance inputs: { [studentId]: AttendanceStatus }
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});

  // Synchronize statusMap when class or existing attendance changes
  React.useEffect(() => {
    const initialMap: Record<string, AttendanceStatus> = {};
    classStudents.forEach((st: User) => {
      const existing = existingAttendance.find(a => a.studentId === st.id);
      initialMap[st.id] = existing ? existing.status : 'H';
    });
    setStatusMap(initialMap);
  }, [classStudents, existingAttendance]);

  const isRecordedToday = existingAttendance.length > 0;
  const recordedCount = existingAttendance.length;

  const currentStatusCounts = useMemo(() => {
    let h = 0, i = 0, s = 0, a = 0;
    classStudents.forEach((st: User) => {
      const stStatus = statusMap[st.id] || 'H';
      if (stStatus === 'H') h++;
      else if (stStatus === 'I') i++;
      else if (stStatus === 'S') s++;
      else if (stStatus === 'A') a++;
    });
    return { h, i, s, a };
  }, [classStudents, statusMap]);

  // 1-Click "Tandai Semua Hadir" (Batch Action)
  const handleMarkAllPresent = () => {
    if (!selectedClassId || classStudents.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Kelas',
        text: 'Tidak ada siswa yang terdaftar dalam kelas yang dipilih.'
      });
      return;
    }

    const records = classStudents.map((student: User) => ({
      studentId: student.id,
      status: 'H' as AttendanceStatus
    }));

    dbService.saveBulkAttendance(selectedClassId, selectedSubjectId, todayStr, records);

    const newMap: Record<string, AttendanceStatus> = {};
    classStudents.forEach((st: User) => {
      newMap[st.id] = 'H';
    });
    setStatusMap(newMap);

    const cls = classes.find(c => c.id === selectedClassId);
    Swal.fire({
      icon: 'success',
      title: 'Presensi Berhasil!',
      text: `Semua ${classStudents.length} siswa kelas ${cls?.nama_kelas || ''} berhasil ditandai HADIR untuk hari ini (${todayStr}).`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Save manual status map changes
  const handleSaveAttendance = () => {
    if (!selectedClassId || classStudents.length === 0) return;

    const records = classStudents.map((student: User) => ({
      studentId: student.id,
      status: statusMap[student.id] || 'H'
    }));

    dbService.saveBulkAttendance(selectedClassId, selectedSubjectId, todayStr, records);

    const cls = classes.find(c => c.id === selectedClassId);
    Swal.fire({
      icon: 'success',
      title: 'Presensi Disimpan!',
      text: `Presensi ${classStudents.length} siswa kelas ${cls?.nama_kelas || ''} tanggal ${todayStr} berhasil diperbarui.`,
      timer: 2000,
      showConfirmButton: false
    });
    setIsExpanded(false);
  };

  const handleExportPDF = () => {
    if (!selectedClassId) return;
    dbService.exportAttendancePDF(selectedClassId, todayStr, selectedSubjectId);
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Form Belum Lengkap',
        text: 'Judul dan isi pengumuman wajib diisi.'
      });
      return;
    }

    const cls = classes.find(c => c.id === selectedClassId);
    let audienceLabel = 'Seluruh Sekolah';
    if (announcementScope === 'homeroom_to_class') {
      audienceLabel = `Khusus Siswa & Ortu ${cls?.nama_kelas || 'Kelas'}`;
    } else if (announcementScope === 'homeroom_to_teachers') {
      audienceLabel = `Khusus Guru Pengampu ${cls?.nama_kelas || 'Kelas'}`;
    } else if (announcementScope === 'homeroom_to_both') {
      audienceLabel = `Siswa & Guru Pengampu ${cls?.nama_kelas || 'Kelas'}`;
    } else if (announcementScope === 'teacher_to_class') {
      audienceLabel = `Siswa ${cls?.nama_kelas || 'Kelas'}`;
    } else if (announcementScope === 'teacher_to_homeroom') {
      audienceLabel = `Wali Kelas ${cls?.nama_kelas || 'Kelas'}`;
    } else if (announcementScope === 'teacher_to_both') {
      audienceLabel = `Siswa & Wali Kelas ${cls?.nama_kelas || 'Kelas'}`;
    }

    dbService.createAnnouncement({
      title: announcementTitle.trim(),
      content: announcementContent.trim(),
      category: announcementCategory,
      author: currentUser.nama,
      authorRole: currentUser.role,
      authorId: currentUser.id,
      priority: 'high',
      targetRole: 'all',
      scope: announcementScope,
      targetClassId: selectedClassId,
      targetClassName: cls?.nama_kelas,
      targetSubjectId: selectedSubjectId !== 'HOMEROOM' ? selectedSubjectId : undefined,
      audienceLabel
    });

    setShowAnnouncementModal(false);
    setAnnouncementTitle('');
    setAnnouncementContent('');

    Swal.fire({
      icon: 'success',
      title: 'Pengumuman Diterbitkan!',
      text: `Pengumuman telah disiarkan ke ${audienceLabel}.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/40 dark:from-slate-800 dark:via-slate-800/95 dark:to-slate-900 rounded-2xl border border-blue-200/80 dark:border-slate-700 p-5 shadow-sm space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Zap className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Quick Actions & Presensi Hari Ini
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <Clock className="w-3 h-3" /> {todayStr}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Akses cepat penginputan presensi harian, publikasi informasi, dan dokumen kelas tanpa berpindah menu
            </p>
          </div>
        </div>

        {/* Quick Shortcut Buttons with Informative Tooltips */}
        <div className="flex items-center gap-2 flex-wrap">
          <QuickActionTooltip
            id="tooltip-announcement"
            label="Kirim Pengumuman (Broadcast)"
            description="Siarkan pengumuman instan dan informasi penting secara real-time ke seluruh civitas sekolah."
            badge="Info"
            position="bottom"
            align="left"
          >
            <button
              type="button"
              onClick={() => setShowAnnouncementModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Kirim Pengumuman: Siarkan pengumuman instan ke seluruh civitas sekolah"
            >
              <Megaphone className="w-3.5 h-3.5 text-blue-500" />
              <span>Kirim Pengumuman</span>
            </button>
          </QuickActionTooltip>

          {onNavigateTab && (currentUser.role === 'guru' || currentUser.role === 'wali_kelas' || currentUser.role === 'admin') && (
            <QuickActionTooltip
              id="tooltip-teacher-journal"
              label="Jurnal Mengajar Guru Mapel"
              description="Input aktivitas KBM, materi pokok, presensi jam pelajaran, dan lacak validasi oleh Wali Kelas."
              badge="KBM & Validasi"
              position="bottom"
              align="center"
            >
              <button
                type="button"
                onClick={() => onNavigateTab('teacher_journal')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 text-blue-800 dark:text-blue-200 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Jurnal Mengajar</span>
              </button>
            </QuickActionTooltip>
          )}

          {onNavigateTab && (currentUser.role === 'wali_kelas' || currentUser.role === 'admin') && (
            <QuickActionTooltip
              id="tooltip-homeroom-books"
              label="Administrasi & Validasi Wali Kelas"
              description="Buka 18 buku administrasi wali kelas, validasi jurnal KBM, kelola jadwal pelajaran & kas."
              badge="18 Buku Wali"
              position="bottom"
              align="center"
            >
              <button
                type="button"
                onClick={() => onNavigateTab('homeroom')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 text-violet-800 dark:text-violet-200 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
              >
                <School className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                <span>Menu Wali Kelas</span>
              </button>
            </QuickActionTooltip>
          )}

          {onNavigateTab && (
            <QuickActionTooltip
              id="tooltip-view-attendance"
              label="Lihat Presensi (View Attendance)"
              description="Buka modul absensi utama untuk memeriksa rekapitulasi kehadiran harian, grafik statistik, dan riwayat presensi siswa."
              badge="Modul Presensi"
              position="bottom"
              align="center"
            >
              <button
                type="button"
                onClick={() => onNavigateTab('attendance')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Lihat Presensi: Buka modul absensi dan rekapitulasi siswa"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Lihat Presensi</span>
              </button>
            </QuickActionTooltip>
          )}

          {onNavigateTab && (
            <QuickActionTooltip
              id="tooltip-print-grades"
              label="Input & Cetak Nilai (Print Grades)"
              description="Akses buku nilai untuk input nilai tugas, formatif, UTS, UAS, dan cetak lembar ledger nilai atau rapor."
              badge="Buku Nilai"
              position="bottom"
              align="center"
            >
              <button
                type="button"
                onClick={() => onNavigateTab('grades')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Input & Cetak Nilai: Buka buku nilai dan cetak leger akademik"
              >
                <Award className="w-3.5 h-3.5 text-indigo-500" />
                <span>Input & Cetak Nilai</span>
              </button>
            </QuickActionTooltip>
          )}

          <QuickActionTooltip
            id="tooltip-export-pdf"
            label="Cetak PDF Presensi Hari Ini"
            description="Ekspor dan unduh dokumen resmi berita acara serta daftar presensi kelas hari ini dalam format PDF siap cetak."
            badge="Ekspor PDF"
            position="bottom"
            align="right"
          >
            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Cetak PDF: Unduh berkas rekap presensi kelas hari ini"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cetak PDF</span>
            </button>
          </QuickActionTooltip>
        </div>
      </div>

      {/* Main Quick Attendance Bar */}
      <div className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/80 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Controls: Class & Subject Selectors */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Kelas:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.nama_kelas}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Sesi:</span>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="HOMEROOM">Presensi Harian Kelas (Wali Kelas)</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    Mapel: {sub.nama_mapel}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Indicator Badge */}
            <div className="flex items-center gap-2">
              {isRecordedToday ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sudah Presensi ({recordedCount}/{classStudents.length} Siswa)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Belum Terisi Hari Ini ({classStudents.length} Siswa)</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1-Click Batch Hadir Semua */}
            <QuickActionTooltip
              id="tooltip-mark-all-present"
              label="Tandai Semua Hadir (1-Klik)"
              description="Secara otomatis menyetel status kehadiran seluruh siswa di kelas ini menjadi 'Hadir' pada tanggal hari ini."
              badge="Batch 1-Klik"
              position="bottom"
              align="center"
            >
              <button
                id="btn-quick-mark-all-present"
                type="button"
                onClick={handleMarkAllPresent}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
                aria-label="Tandai Semua Hadir: Otomatis setel semua siswa hadir hari ini"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Tandai Semua Hadir (1-Klik)</span>
              </button>
            </QuickActionTooltip>

            {/* Expand / Roster button */}
            <QuickActionTooltip
              id="tooltip-toggle-roster"
              label={isExpanded ? 'Tutup Daftar Siswa' : 'Edit Presensi Cepat'}
              description={
                isExpanded
                  ? 'Sembunyikan lembar daftar pengisian presensi siswa.'
                  : 'Buka daftar siswa untuk mengubah kehadiran individu (Hadir, Izin, Sakit, Alpa) secara langsung.'
              }
              badge="Roster Siswa"
              position="bottom"
              align="right"
            >
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label={isExpanded ? 'Tutup daftar absensi cepat' : 'Buka daftar absensi cepat per siswa'}
              >
                <Users className="w-4 h-4" />
                <span>{isExpanded ? 'Tutup Daftar' : 'Edit Presensi Cepat'}</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </QuickActionTooltip>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-slate-600 dark:text-slate-300 flex-wrap">
          <span className="text-slate-400">Status Aktif:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Hadir: {currentStatusCounts.h}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Izin: {currentStatusCounts.i}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Sakit: {currentStatusCounts.s}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            Alpa: {currentStatusCounts.a}
          </span>
        </div>

        {/* Expandable Quick Attendance Roster Sheet */}
        {isExpanded && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Daftar Siswa {selectedClass?.nama_kelas || ''} ({classStudents.length} siswa)
              </span>
              <QuickActionTooltip
                id="tooltip-save-attendance-header"
                label="Simpan Perubahan Presensi"
                description="Simpan pembaharuan kehadiran seluruh siswa kelas ini ke basis data lokal dan sinkronisasi server."
                badge="Simpan"
                position="bottom"
                align="right"
              >
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                  aria-label="Simpan perubahan status presensi siswa"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan Presensi</span>
                </button>
              </QuickActionTooltip>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {classStudents.map((st: User, idx: number) => {
                const currentSt = statusMap[st.id] || 'H';

                return (
                  <div
                    key={st.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {idx + 1}. {st.nama}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate font-mono">@{st.username}</div>
                    </div>

                    {/* Toggle H/I/S/A buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {(['H', 'I', 'S', 'A'] as AttendanceStatus[]).map((status) => {
                        const isSelected = currentSt === status;
                        let activeStyle = '';
                        if (status === 'H') activeStyle = 'bg-emerald-600 text-white border-emerald-600';
                        if (status === 'I') activeStyle = 'bg-blue-600 text-white border-blue-600';
                        if (status === 'S') activeStyle = 'bg-amber-600 text-white border-amber-600';
                        if (status === 'A') activeStyle = 'bg-rose-600 text-white border-rose-600';

                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setStatusMap(prev => ({ ...prev, [st.id]: status }))}
                            className={`w-6 h-6 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center justify-center ${
                              isSelected
                                ? activeStyle
                                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-1">
              <QuickActionTooltip
                id="tooltip-save-attendance-bottom"
                label="Simpan Presensi Hari Ini"
                description={`Simpan seluruh catatan presensi tanggal ${todayStr} ke penyimpanan lokal dan sinkronisasi server.`}
                badge="Simpan"
                position="top"
                align="right"
              >
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                  aria-label={`Simpan Presensi Hari Ini tanggal ${todayStr}`}
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Presensi Hari Ini ({todayStr})</span>
                </button>
              </QuickActionTooltip>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Kirim Pengumuman Instan */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Kirim Pengumuman Instan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jangkauan Penerima (Scope)
                </label>
                <select
                  value={announcementScope}
                  onChange={(e) => setAnnouncementScope(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {currentUser.role === 'wali_kelas' && (
                    <>
                      <option value="homeroom_to_class">🏫 Khusus Kelas Saya (Siswa & Orang Tua)</option>
                      <option value="homeroom_to_teachers">👨‍🏫 Khusus Guru Pengampu Mapel di Kelas Saya</option>
                      <option value="homeroom_to_both">👥 Siswa, Orang Tua & Seluruh Guru Pengampu</option>
                      <option value="school_wide">🌐 Seluruh Sekolah (Umum)</option>
                    </>
                  )}

                  {currentUser.role === 'guru' && (
                    <>
                      <option value="teacher_to_class">👨‍🎓 Siswa di Kelas Ini ({selectedClass?.nama_kelas || 'Kelas'})</option>
                      <option value="teacher_to_homeroom">📋 Wali Kelas dari Kelas Ini ({selectedClass?.nama_kelas || 'Kelas'})</option>
                      <option value="teacher_to_both">🤝 Siswa & Wali Kelas ({selectedClass?.nama_kelas || 'Kelas'})</option>
                      <option value="school_wide">🌐 Seluruh Sekolah (Umum)</option>
                    </>
                  )}

                  {currentUser.role === 'admin' && (
                    <>
                      <option value="school_wide">🌐 Seluruh Sekolah (Umum)</option>
                      <option value="homeroom_to_class">🏫 Khusus Siswa & Ortu ({selectedClass?.nama_kelas || 'Kelas'})</option>
                      <option value="homeroom_to_teachers">👨‍🏫 Khusus Guru Pengampu ({selectedClass?.nama_kelas || 'Kelas'})</option>
                      <option value="homeroom_to_both">👥 Siswa & Guru Pengampu ({selectedClass?.nama_kelas || 'Kelas'})</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori
                </label>
                <select
                  value={announcementCategory}
                  onChange={(e) => setAnnouncementCategory(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="Penting">Penting (Darurat / Mendesak)</option>
                  <option value="Akademik">Akademik (Jadwal Ujian / Remedial)</option>
                  <option value="Kegiatan">Kegiatan (Kesiswaan / Lomba)</option>
                  <option value="Libur">Libur & Agenda Khusus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Contoh: Pengingat Jadwal Try Out Matematika Besok"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Isi Pesan Pengumuman
                </label>
                <textarea
                  rows={4}
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Tuliskan detail pengumuman yang akan langsung terlihat di banner dashboard..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Siarkan Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
