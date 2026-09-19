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
  UserCheck
} from 'lucide-react';
import { ClassJournalItem } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';

interface HomeroomJournalProps {
  classId: string;
  className: string;
  journals: ClassJournalItem[];
  onRefresh: () => void;
}

export const HomeroomJournal: React.FC<HomeroomJournalProps> = ({
  classId,
  className,
  journals,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState('1 - 2 (07:15 - 08:45)');
  const [subjectName, setSubjectName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [competencyOrTopic, setCompetencyOrTopic] = useState('');
  const [materialsSummary, setMaterialsSummary] = useState('');
  const [attendanceNote, setAttendanceNote] = useState('');
  const [classIncident, setClassIncident] = useState('');

  const filtered = journals.filter(j => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      j.subjectName.toLowerCase().includes(q) ||
      j.teacherName.toLowerCase().includes(q) ||
      j.competencyOrTopic.toLowerCase().includes(q) ||
      j.materialsSummary.toLowerCase().includes(q) ||
      j.attendanceNote.toLowerCase().includes(q)
    );
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName || !teacherName || !materialsSummary) return;

    service.addClassJournal(classId, {
      date,
      period,
      subjectName,
      teacherName,
      competencyOrTopic: competencyOrTopic || subjectName,
      materialsSummary,
      attendanceNote: attendanceNote || 'Hadir Lengkap',
      classIncident: classIncident || 'KBM berjalan lancar dan tertib.',
      teacherSign: true
    });

    setShowAddModal(false);
    setSubjectName('');
    setTeacherName('');
    setCompetencyOrTopic('');
    setMaterialsSummary('');
    setAttendanceNote('');
    setClassIncident('');
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/70 text-violet-800 dark:text-violet-300 text-xs font-black">
              MENU 13
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Buku Jurnal Harian Kelas ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rekam aktivitas mengajar harian, materi pokok, absensi per jam pelajaran, dan paraf guru mapel
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Buku Jurnal</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-violet-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Isi Jurnal KBM</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari mata pelajaran, guru pengajar, atau materi pokok..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-slate-200"
        />
      </div>

      {/* Journal Cards List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map(item => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3 hover:border-violet-300 dark:hover:border-violet-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 text-xs font-black">
                    {item.date}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Jam: {item.period}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {item.subjectName}
                  </h4>
                  <span className="text-xs text-slate-500">
                    (Guru: <strong>{item.teacherName}</strong>)
                  </span>
                  {item.teacherSign && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3" />
                      Terverifikasi Paraf
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer self-end sm:self-auto"
                  title="Hapus jurnal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Topik & Materi Pembelajaran:
                  </span>
                  <div className="font-bold text-slate-900 dark:text-white">{item.competencyOrTopic}</div>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">{item.materialsSummary}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 block">
                      Catatan Kehadiran Siswa:
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">{item.attendanceNote}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      Situasi & Kejadian Penting Kelas:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">{item.classIncident}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            Belum ada catatan jurnal harian kelas.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Isi Jurnal KBM Kelas
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tanggal</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Jam Ke</label>
                  <input
                    type="text"
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    placeholder="Contoh: 1 - 2 (07:15 - 08:45)"
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
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
                  placeholder="Contoh: Matematika Wajib"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Guru Pengajar</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  placeholder="Nama lengkap guru pengajar..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Topik / Kompetensi</label>
                <input
                  type="text"
                  value={competencyOrTopic}
                  onChange={e => setCompetencyOrTopic(e.target.value)}
                  placeholder="Contoh: Sistem Persamaan Linear Tiga Variabel"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Uraian Materi & Aktivitas Pembelajaran
                </label>
                <textarea
                  rows={2}
                  value={materialsSummary}
                  onChange={e => setMaterialsSummary(e.target.value)}
                  placeholder="Rangkuman kegiatan belajar, diskusi kelompok, praktikum..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Catatan Kehadiran Siswa
                </label>
                <input
                  type="text"
                  value={attendanceNote}
                  onChange={e => setAttendanceNote(e.target.value)}
                  placeholder="Contoh: 35 Hadir, 1 Sakit (Bayu)"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Kejadian Kelas / Ketertiban
                </label>
                <input
                  type="text"
                  value={classIncident}
                  onChange={e => setClassIncident(e.target.value)}
                  placeholder="Kelas kondusif, tugas selesai tepat waktu..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
