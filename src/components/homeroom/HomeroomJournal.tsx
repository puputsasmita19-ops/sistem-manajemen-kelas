import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  BookOpen,
  Calendar,
  Plus,
  Trash2,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  FileCheck,
  Edit,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  XCircle,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { ClassJournalItem, JournalValidationStatus } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';
import { HomeroomPdfExporter } from '../../services/homeroomPdfExporter';

interface HomeroomJournalProps {
  classId: string;
  className: string;
  journals: ClassJournalItem[];
  userRole?: string;
  currentUserName?: string;
  onRefresh: () => void;
}

export const HomeroomJournal: React.FC<HomeroomJournalProps> = ({
  classId,
  className,
  journals,
  userRole = 'wali_kelas',
  currentUserName = 'Puput Sasmita, S.Pd., Gr.',
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const isWaliKelas = userRole === 'wali_kelas' || userRole === 'admin';
  const isGuruMapel = userRole === 'guru';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | JournalValidationStatus>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ClassJournalItem | null>(null);

  // Revision Modal State
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisingJournal, setRevisingJournal] = useState<ClassJournalItem | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState('1 - 2 (07:15 - 08:45)');
  const [subjectName, setSubjectName] = useState('');
  const [teacherName, setTeacherName] = useState(isGuruMapel ? currentUserName : '');
  const [competencyOrTopic, setCompetencyOrTopic] = useState('');
  const [materialsSummary, setMaterialsSummary] = useState('');
  const [attendanceNote, setAttendanceNote] = useState('');
  const [classIncident, setClassIncident] = useState('');

  // Statistics
  const totalCount = journals.length;
  const pendingCount = journals.filter(j => j.validationStatus === 'Menunggu Validasi').length;
  const verifiedCount = journals.filter(j => j.validationStatus === 'Terverifikasi').length;
  const revisionCount = journals.filter(j => j.validationStatus === 'Perlu Revisi').length;

  const filtered = journals.filter(j => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      j.subjectName.toLowerCase().includes(q) ||
      j.teacherName.toLowerCase().includes(q) ||
      j.competencyOrTopic.toLowerCase().includes(q) ||
      j.materialsSummary.toLowerCase().includes(q) ||
      j.attendanceNote.toLowerCase().includes(q);

    const matchStatus = filterStatus === 'all' || j.validationStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setDate(new Date().toISOString().split('T')[0]);
    setPeriod('1 - 2 (07:15 - 08:45)');
    setSubjectName('');
    setTeacherName(isGuruMapel ? currentUserName : '');
    setCompetencyOrTopic('');
    setMaterialsSummary('');
    setAttendanceNote('35 Hadir Lengkap (100%)');
    setClassIncident('KBM berjalan kondusif, tertib dan lancar.');
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: ClassJournalItem) => {
    setEditingItem(item);
    setDate(item.date);
    setPeriod(item.period);
    setSubjectName(item.subjectName);
    setTeacherName(item.teacherName);
    setCompetencyOrTopic(item.competencyOrTopic);
    setMaterialsSummary(item.materialsSummary);
    setAttendanceNote(item.attendanceNote);
    setClassIncident(item.classIncident);
    setShowAddModal(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName || !teacherName || !materialsSummary) return;

    if (editingItem) {
      service.updateClassJournal(classId, {
        ...editingItem,
        date,
        period,
        subjectName,
        teacherName,
        competencyOrTopic: competencyOrTopic || subjectName,
        materialsSummary,
        attendanceNote: attendanceNote || 'Hadir Lengkap',
        classIncident: classIncident || 'KBM berjalan tertib.',
        validationStatus: isWaliKelas ? 'Terverifikasi' : 'Menunggu Validasi'
      });
    } else {
      service.addClassJournal(classId, {
        date,
        period,
        subjectName,
        teacherName,
        submittedByRole: isGuruMapel ? 'guru_mapel' : 'wali_kelas',
        competencyOrTopic: competencyOrTopic || subjectName,
        materialsSummary,
        attendanceNote: attendanceNote || 'Hadir Lengkap',
        classIncident: classIncident || 'KBM berjalan lancar dan tertib.',
        teacherSign: true,
        validationStatus: isWaliKelas ? 'Terverifikasi' : 'Menunggu Validasi'
      });
    }

    setShowAddModal(false);
    onRefresh();
  };

  // Wali Kelas 1-Click Verification
  const handleValidateJournal = (journal: ClassJournalItem) => {
    Swal.fire({
      title: 'Validasi & Paraf Jurnal KBM?',
      html: `
        <div class="text-left text-xs space-y-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
          <div><strong>Mata Pelajaran:</strong> ${journal.subjectName}</div>
          <div><strong>Guru Pengajar:</strong> ${journal.teacherName}</div>
          <div><strong>Materi:</strong> ${journal.competencyOrTopic}</div>
          <div><strong>Tanggal & Jam:</strong> ${journal.date} (${journal.period})</div>
        </div>
        <p class="text-xs text-slate-500 mt-2">Dengan memvalidasi, jurnal ini resmi disetujui dan diparaf digital oleh Wali Kelas (${currentUserName}).</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, ACC & Paraf Resmi',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.validateClassJournal(classId, journal.id, 'Terverifikasi', currentUserName, 'KBM terlaksana dengan baik.');
        onRefresh();
      }
    });
  };

  // Wali Kelas Request Revision
  const handleOpenRevisionPrompt = (journal: ClassJournalItem) => {
    setRevisingJournal(journal);
    setRevisionNotes(journal.validationNotes || 'Mohon lengkapi rincian nomor TP / tugas praktikum siswa.');
    setShowRevisionModal(true);
  };

  const handleConfirmRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisingJournal) return;

    service.validateClassJournal(classId, revisingJournal.id, 'Perlu Revisi', currentUserName, revisionNotes);
    setShowRevisionModal(false);
    setRevisingJournal(null);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Jurnal Harian?',
      text: 'Catatan agenda KBM harian ini akan dihapus dari buku jurnal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.deleteClassJournal(classId, id);
        onRefresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Workflow Banner */}
      <div className="bg-gradient-to-r from-violet-700 via-indigo-800 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-violet-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-violet-400/20 text-violet-200 text-xs font-black border border-violet-400/30">
              MENU 13 • KBM & VALIDASI
            </span>
            <span className="text-xs font-bold text-violet-200">
              {isWaliKelas ? '👑 Peran: Wali Kelas (Verifikator)' : '📝 Peran: Guru Mapel (Penginput)'}
            </span>
          </div>
          <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            Buku Jurnal Harian KBM Kelas ({className})
          </h3>
          <p className="text-xs text-violet-100/80 max-w-2xl leading-relaxed">
            {isWaliKelas
              ? 'Guru Mapel menginput aktivitas mengajarnya masing-masing. Tugas Wali Kelas adalah memverifikasi, memvalidasi dan memaraf kesesuaian KBM.'
              : 'Silakan isi jurnal pembelajaran untuk jam mapel Anda. Jurnal yang Anda simpan akan divalidasi dan diparaf oleh Wali Kelas.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => HomeroomPdfExporter.exportJournalPDF(className, journals)}
            className="px-3 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-1.5 transition border border-white/20 cursor-pointer shadow-xs"
            title="Cetak Buku Jurnal Resmi"
          >
            <Printer className="w-4 h-4 text-violet-200" />
            <span>Cetak PDF</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-black text-violet-950 bg-white hover:bg-violet-50 rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-violet-700" />
            <span>{isGuruMapel ? 'Isi Jurnal Mapel' : 'Tambah / Input Jurnal'}</span>
          </button>
        </div>
      </div>

      {/* KPI Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Total Jurnal KBM</div>
          <div className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-violet-600" />
            <span>{totalCount}</span>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border shadow-xs space-y-1 ${
            pendingCount > 0
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 animate-pulse'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 tracking-wider">
            Menunggu Validasi Wali
          </div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{pendingCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
            Terverifikasi & ACC
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{verifiedCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
          <div className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">
            Perlu Revisi
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            <span>{revisionCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('Menunggu Validasi')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'Menunggu Validasi'
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Menunggu Validasi ({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('Terverifikasi')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'Terverifikasi'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Terverifikasi ({verifiedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('Perlu Revisi')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'Perlu Revisi'
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Perlu Revisi ({revisionCount})</span>
          </button>
        </div>

        {/* Search Field */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari mapel, nama guru, materi, atau topik..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Journal Cards List */}
      <div className="space-y-3.5">
        {filtered.length > 0 ? (
          filtered.map(item => {
            const isPending = item.validationStatus === 'Menunggu Validasi';
            const isVerified = item.validationStatus === 'Terverifikasi';
            const isNeedsRevision = item.validationStatus === 'Perlu Revisi';

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border p-4 shadow-xs space-y-3 transition ${
                  isPending
                    ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/20'
                    : isVerified
                    ? 'border-emerald-200 dark:border-emerald-800/60'
                    : isNeedsRevision
                    ? 'border-rose-300 dark:border-rose-800/60 bg-rose-50/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Header of Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 text-xs font-black">
                      {item.date}
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Jam: {item.period}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {item.subjectName}
                    </h4>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      (Guru Mapel: <strong className="text-slate-900 dark:text-white">{item.teacherName}</strong>)
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Terverifikasi ACC Paraf</span>
                      </span>
                    )}

                    {isPending && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-lg animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Menunggu Validasi Wali</span>
                      </span>
                    )}

                    {isNeedsRevision && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 px-2.5 py-1 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Perlu Revisi</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Body */}
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl space-y-1 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Topik / Capaian Pembelajaran & Ringkasan Materi:
                    </span>
                    <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {item.competencyOrTopic}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {item.materialsSummary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-0.5">
                      <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 block">
                        Presensi & Catatan Kehadiran Jam Mapel:
                      </span>
                      <span className="text-slate-900 dark:text-white font-bold">{item.attendanceNote}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 space-y-0.5">
                      <span className="text-[10px] font-black text-slate-400 block">
                        Situasi & Kejadian Khusus Kelas:
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{item.classIncident}</span>
                    </div>
                  </div>

                  {/* Validation Log / Notes Box */}
                  {(item.validatedByWaliName || item.validationNotes) && (
                    <div
                      className={`p-2.5 rounded-xl border flex items-start gap-2 text-xs ${
                        isNeedsRevision
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                          : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold text-[11px]">
                          Catatan Validasi Wali Kelas ({item.validatedByWaliName || 'Wali Kelas'} - {item.validationDate || item.date}):
                        </div>
                        <div className="font-medium">{item.validationNotes || 'Sudah divalidasi dan disetujui.'}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>
                      Diinput oleh: <strong>{item.teacherName}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Wali Kelas Validation Buttons */}
                    {isWaliKelas && isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenRevisionPrompt(item)}
                          className="px-2.5 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 rounded-xl transition flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Minta Revisi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleValidateJournal(item)}
                          className="px-3 py-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Verifikasi & ACC Paraf</span>
                        </button>
                      </>
                    )}

                    {isWaliKelas && isVerified && (
                      <button
                        type="button"
                        onClick={() => handleOpenRevisionPrompt(item)}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                        title="Ubah status validasi atau catatan"
                      >
                        Edit Catatan Validasi
                      </button>
                    )}

                    {/* Guru Mapel Quick Re-edit when revision is needed */}
                    {isNeedsRevision && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Perbaiki & Ajukan Ulang</span>
                      </button>
                    )}

                    {/* Standard Edit & Delete */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-violet-600 rounded-lg transition cursor-pointer"
                      title="Edit Jurnal"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                      title="Hapus Jurnal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400 text-xs space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <div>Tidak ada catatan jurnal KBM yang sesuai filter.</div>
          </div>
        )}
      </div>

      {/* MODAL: INPUT / EDIT JURNAL KBM */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-5 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingItem ? 'Edit Jurnal Pembelajaran' : 'Isi Jurnal Pembelajaran Guru Mapel'}
                  </h4>
                  <p className="text-[11px] text-slate-500">Kelas: {className}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tanggal KBM</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Jam Ke- / Waktu</label>
                  <input
                    type="text"
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    placeholder="Contoh: 1 - 2 (07:15 - 08:45)"
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={e => setSubjectName(e.target.value)}
                    placeholder="Contoh: Matematika, Bahasa Indonesia, APL"
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Guru Pengajar</label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={e => setTeacherName(e.target.value)}
                    placeholder="Nama lengkap guru mapel..."
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Capaian Pembelajaran / TP / Pokok Bahasan
                </label>
                <input
                  type="text"
                  value={competencyOrTopic}
                  onChange={e => setCompetencyOrTopic(e.target.value)}
                  placeholder="Contoh: Analisis Gravimetri & Titrasi Asam Basa"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Uraian Aktivitas Pembelajaran & Penugasan
                </label>
                <textarea
                  rows={3}
                  value={materialsSummary}
                  onChange={e => setMaterialsSummary(e.target.value)}
                  placeholder="Rangkuman kegiatan belajar mengajar di kelas, praktikum laboratorium, latihan soal, atau diskusi..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Presensi & Kehadiran Jam Mapel
                  </label>
                  <input
                    type="text"
                    value={attendanceNote}
                    onChange={e => setAttendanceNote(e.target.value)}
                    placeholder="Contoh: 35 Hadir, 1 Sakit (Bayu)"
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Catatan Kejadian Khusus / Ketertiban
                  </label>
                  <input
                    type="text"
                    value={classIncident}
                    onChange={e => setClassIncident(e.target.value)}
                    placeholder="Contoh: Kelas tertib, praktikum lancar"
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {isGuruMapel ? 'Simpan & Ajukan ke Wali Kelas' : 'Simpan Jurnal KBM'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MINTA REVISI DARI WALI KELAS */}
      {showRevisionModal && revisingJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Kirim Catatan Revisi Jurnal
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Untuk: {revisingJournal.teacherName} ({revisingJournal.subjectName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmRevision} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pesan / Poin Perbaikan untuk Guru Mapel:
                </label>
                <textarea
                  rows={4}
                  required
                  value={revisionNotes}
                  onChange={e => setRevisionNotes(e.target.value)}
                  placeholder="Tuliskan bagian apa yang perlu dilengkapi (contoh: mohon rincikan tugas siswa yang sakit, nomor indikator TP)..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Kirim Status Perlu Revisi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
