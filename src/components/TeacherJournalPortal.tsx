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
  Building2,
  Sparkles,
  School,
  Send,
  MessageSquare
} from 'lucide-react';
import { User } from '../types';
import { ClassJournalItem, JournalValidationStatus } from '../types/homeroom';
import { HomeroomService } from '../services/homeroomService';
import { HomeroomPdfExporter } from '../services/homeroomPdfExporter';

interface TeacherJournalPortalProps {
  currentUser: User;
}

interface ClassOption {
  id: string;
  name: string;
  waliKelas: string;
}

const AVAILABLE_CLASSES: ClassOption[] = [
  { id: 'class_10_ipa1', name: 'XI APL (Kimia Analis)', waliKelas: 'Puput Sasmita, S.Pd., Gr.' },
  { id: 'class_10_ipa2', name: 'X APL', waliKelas: 'Siti Rahmawati, M.Pd' },
  { id: 'class_11_ipa1', name: 'XII APL', waliKelas: 'Hendra Setiawan, S.Pd' },
  { id: 'class_12_ipa1', name: 'X AKL (Akuntansi)', waliKelas: 'Drs. Hendrawan' }
];

export const TeacherJournalPortal: React.FC<TeacherJournalPortalProps> = ({ currentUser }) => {
  const service = HomeroomService.getInstance();
  const [selectedClassId, setSelectedClassId] = useState<string>('class_10_ipa1');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | JournalValidationStatus>('all');

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ClassJournalItem | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState('1 - 2 (07:15 - 08:45)');
  const [subjectName, setSubjectName] = useState('Kimia Terapan & Praktikum');
  const [competencyOrTopic, setCompetencyOrTopic] = useState('');
  const [materialsSummary, setMaterialsSummary] = useState('');
  const [attendanceNote, setAttendanceNote] = useState('35 Hadir Lengkap (100%)');
  const [classIncident, setClassIncident] = useState('KBM berjalan tertib dan kondusif.');

  const activeClassInfo = AVAILABLE_CLASSES.find(c => c.id === selectedClassId) || AVAILABLE_CLASSES[0];
  const classData = service.getClassHomeroomData(selectedClassId);
  const classJournals = classData.classJournals;

  // Filter journals for this teacher or show all for this class
  const filtered = classJournals.filter(j => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      j.subjectName.toLowerCase().includes(q) ||
      j.teacherName.toLowerCase().includes(q) ||
      j.competencyOrTopic.toLowerCase().includes(q) ||
      j.materialsSummary.toLowerCase().includes(q);

    const matchStatus = statusFilter === 'all' || j.validationStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalClassJournals = classJournals.length;
  const pendingCount = classJournals.filter(j => j.validationStatus === 'Menunggu Validasi').length;
  const verifiedCount = classJournals.filter(j => j.validationStatus === 'Terverifikasi').length;
  const revisionCount = classJournals.filter(j => j.validationStatus === 'Perlu Revisi').length;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setDate(new Date().toISOString().split('T')[0]);
    setPeriod('1 - 2 (07:15 - 08:45)');
    setSubjectName('Kimia Terapan & Analis');
    setCompetencyOrTopic('');
    setMaterialsSummary('');
    setAttendanceNote('35 Hadir Lengkap (100%)');
    setClassIncident('KBM berlangsung tertib.');
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: ClassJournalItem) => {
    setEditingItem(item);
    setDate(item.date);
    setPeriod(item.period);
    setSubjectName(item.subjectName);
    setCompetencyOrTopic(item.competencyOrTopic);
    setMaterialsSummary(item.materialsSummary);
    setAttendanceNote(item.attendanceNote);
    setClassIncident(item.classIncident);
    setShowAddModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName || !competencyOrTopic || !materialsSummary) return;

    if (editingItem) {
      service.updateClassJournal(selectedClassId, {
        ...editingItem,
        date,
        period,
        subjectName,
        teacherName: currentUser.nama,
        teacherId: currentUser.id,
        competencyOrTopic,
        materialsSummary,
        attendanceNote,
        classIncident,
        validationStatus: 'Menunggu Validasi' // Re-set to pending for re-check
      });
    } else {
      service.addClassJournal(selectedClassId, {
        date,
        period,
        subjectName,
        teacherName: currentUser.nama,
        teacherId: currentUser.id,
        submittedByRole: 'guru_mapel',
        competencyOrTopic,
        materialsSummary,
        attendanceNote,
        classIncident,
        teacherSign: true,
        validationStatus: 'Menunggu Validasi'
      });
    }

    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Jurnal Mengajar?',
      text: 'Jurnal KBM ini akan dihapus dari daftar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.deleteClassJournal(selectedClassId, id);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-blue-600/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full bg-blue-400/20 text-blue-200 text-xs font-black border border-blue-400/30">
              PORTAL GURU MAPEL
            </span>
            <span className="text-xs font-bold text-blue-200">
              Pengampu: {currentUser.nama}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Jurnal Mengajar Guru Mapel
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/80 max-w-2xl leading-relaxed">
            Input aktivitas mengajar, materi pokok, dan presensi per jam pelajaran Anda. Jurnal yang tersimpan otomatis masuk ke antrean verifikasi Wali Kelas masing-masing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => HomeroomPdfExporter.exportJournalPDF(activeClassInfo.name, classJournals)}
            className="px-3.5 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-1.5 transition border border-white/20 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-blue-200" />
            <span>Cetak Jurnal PDF</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-black text-blue-950 bg-white hover:bg-blue-50 rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-700" />
            <span>Isi Jurnal KBM Baru</span>
          </button>
        </div>
      </div>

      {/* Class Selector Bar & Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Class Switcher Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <School className="w-4 h-4 text-blue-600" />
            <span>Pilih Kelas Mengajar:</span>
          </div>

          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="w-full bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-blue-900 rounded-xl px-3 py-2.5 text-xs font-black text-blue-950 dark:text-blue-200 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {AVAILABLE_CLASSES.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} (Wali: {c.waliKelas})
              </option>
            ))}
          </select>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl">
            Wali Kelas Pengampu: <strong className="text-slate-800 dark:text-slate-200">{activeClassInfo.waliKelas}</strong>
          </div>
        </div>

        {/* Status Counters */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
            <div className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">
              Menunggu Validasi Wali
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>{pendingCount}</span>
            </div>
            <p className="text-[10px] text-slate-400">Jurnal menunggu paraf wali kelas</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
            <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
              Terverifikasi / ACC
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{verifiedCount}</span>
            </div>
            <p className="text-[10px] text-slate-400">Resmi diparaf oleh wali kelas</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
            <div className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">
              Perlu Revisi
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{revisionCount}</span>
            </div>
            <p className="text-[10px] text-slate-400">Perlu dilengkapi guru</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Semua Jurnal ({totalClassJournals})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Menunggu Validasi')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Menunggu Validasi'
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Menunggu Validasi ({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Terverifikasi')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Terverifikasi'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Terverifikasi ({verifiedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Perlu Revisi')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Perlu Revisi'
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Perlu Revisi ({revisionCount})</span>
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari mata pelajaran, topik materi..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-black">
                      {item.date}
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Jam: {item.period}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {item.subjectName}
                    </h4>
                    <span className="text-xs text-slate-500">
                      (Guru: <strong>{item.teacherName}</strong>)
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Terverifikasi & ACC Paraf Wali Kelas</span>
                      </span>
                    )}

                    {isPending && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-lg animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Menunggu Validasi Wali Kelas</span>
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

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl space-y-1 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Topik / Pokok Bahasan & Ringkasan Materi:
                    </span>
                    <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {item.competencyOrTopic}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {item.materialsSummary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                      <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 block">
                        Presensi Siswa di Jam Mapel:
                      </span>
                      <span className="text-slate-900 dark:text-white font-bold">{item.attendanceNote}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-black text-slate-400 block">
                        Situasi / Catatan Kejadian Khusus:
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{item.classIncident}</span>
                    </div>
                  </div>

                  {/* Catatan dari Wali Kelas */}
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
                          Tanggapan Wali Kelas ({item.validatedByWaliName || activeClassInfo.waliKelas}):
                        </div>
                        <div className="font-medium">{item.validationNotes}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="text-[11px] text-slate-500">
                    Kelas: <strong>{activeClassInfo.name}</strong> • Wali: <strong>{activeClassInfo.waliKelas}</strong>
                  </div>

                  <div className="flex items-center gap-2">
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

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition cursor-pointer"
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
            <div>Belum ada catatan jurnal KBM untuk kelas ini.</div>
          </div>
        )}
      </div>

      {/* MODAL INPUT JURNAL GURU */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-5 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingItem ? 'Edit Jurnal Pembelajaran' : 'Isi Jurnal KBM Guru Mapel'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Kelas: {activeClassInfo.name} (Wali: {activeClassInfo.waliKelas})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
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

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Mata Pelajaran</label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={e => setSubjectName(e.target.value)}
                  placeholder="Nama mata pelajaran yang Anda ampu..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-semibold"
                  required
                />
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
                  placeholder="Rangkuman kegiatan belajar mengajar di kelas, praktikum laboratorium, latihan soal..."
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Simpan & Kirim ke Wali Kelas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
