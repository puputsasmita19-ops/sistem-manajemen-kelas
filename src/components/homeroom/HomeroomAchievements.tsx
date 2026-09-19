import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  Trophy,
  Award,
  Medal,
  Plus,
  Trash2,
  Printer,
  Search,
  Sparkles,
  Calendar,
  Building,
  UserCheck
} from 'lucide-react';
import { StudentAchievementItem } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';
import { HomeroomPdfExporter } from '../../services/homeroomPdfExporter';

interface HomeroomAchievementsProps {
  classId: string;
  className: string;
  achievements: StudentAchievementItem[];
  studentList: Array<{ id: string; nama: string }>;
  onRefresh: () => void;
}

export const HomeroomAchievements: React.FC<HomeroomAchievementsProps> = ({
  classId,
  className,
  achievements,
  studentList,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentName, setStudentName] = useState('');
  const [achievementTitle, setAchievementTitle] = useState('');
  const [field, setField] = useState<StudentAchievementItem['field']>('Sains / Olimpiade');
  const [competitionLevel, setCompetitionLevel] = useState<StudentAchievementItem['competitionLevel']>('Kota / Kabupaten');
  const [rank, setRank] = useState<StudentAchievementItem['rank']>('Juara 1');
  const [organizer, setOrganizer] = useState('');
  const [coachTeacher, setCoachTeacher] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = achievements.filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      a.studentName.toLowerCase().includes(q) ||
      a.achievementTitle.toLowerCase().includes(q) ||
      a.field.toLowerCase().includes(q) ||
      a.competitionLevel.toLowerCase().includes(q) ||
      a.organizer.toLowerCase().includes(q)
    );
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !achievementTitle || !rank) return;

    service.addStudentAchievement(classId, {
      date,
      studentId: `std_${Date.now()}`,
      studentName,
      achievementTitle,
      field,
      competitionLevel,
      rank,
      organizer: organizer || 'Dinas Pendidikan & Kebudayaan',
      coachTeacher: coachTeacher || undefined,
      notes: notes || undefined
    });

    setShowAddModal(false);
    setAchievementTitle('');
    setOrganizer('');
    setCoachTeacher('');
    setNotes('');
    onRefresh();
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Catatan Prestasi?',
      text: 'Data capaian penghargaan siswa ini akan dihapus dari buku prestasi kelas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.deleteStudentAchievement(classId, id);
        onRefresh();
      }
    });
  };

  const levelBadge = (lvl: StudentAchievementItem['competitionLevel']) => {
    switch (lvl) {
      case 'Internasional':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
      case 'Nasional':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
      case 'Provinsi':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'Kota / Kabupaten':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'Kecamatan':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300';
      default:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-xs font-black">
              MENU 16
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Buku Catatan Prestasi & Penghargaan Siswa ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dokumentasi kejuaraan akademik, sains, seni, olahraga, piagam penghargaan, dan guru pembimbing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => HomeroomPdfExporter.exportAchievementsPDF(className, achievements)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Buku Prestasi</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Prestasi</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Prestasi</span>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-400">
            {achievements.length} <span className="text-xs font-normal">Penghargaan</span>
          </div>
          <p className="text-[10px] text-amber-600/80">Raihan kelas {className}</p>
        </div>

        <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-purple-800 dark:text-purple-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tingkat Nasional+</span>
            <Medal className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-purple-700 dark:text-purple-400">
            {achievements.filter(a => a.competitionLevel === 'Nasional' || a.competitionLevel === 'Internasional').length}
          </div>
          <p className="text-[10px] text-purple-600/80">Skala tinggi & bergengsi</p>
        </div>

        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-800 dark:text-blue-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tingkat Provinsi</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-blue-700 dark:text-blue-400">
            {achievements.filter(a => a.competitionLevel === 'Provinsi').length}
          </div>
          <p className="text-[10px] text-blue-600/80">Olimpiade & kejurda</p>
        </div>

        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">Kota & Sekolah</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
            {achievements.filter(a => a.competitionLevel === 'Kota / Kabupaten' || a.competitionLevel === 'Kecamatan' || a.competitionLevel === 'Sekolah').length}
          </div>
          <p className="text-[10px] text-emerald-600/80">Kompetisi daerah & internal</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari prestasi berdasarkan nama siswa, ajang perlombaan, atau bidang..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
        />
      </div>

      {/* Achievements Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length > 0 ? (
          filtered.map(item => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3 hover:border-amber-300 dark:hover:border-amber-700 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">{item.date}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${levelBadge(item.competitionLevel)}`}>
                      {item.competitionLevel}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.studentName}
                  </h4>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-white text-xs font-black shadow-xs">
                    {item.rank}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                    title="Hapus rekaman"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl space-y-1 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                  Ajang / Cabang Lomba:
                </span>
                <p className="text-slate-900 dark:text-white font-bold text-sm">
                  {item.achievementTitle}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-300 pt-1 text-[11px]">
                  <span>Bidang: <strong>{item.field}</strong></span>
                  <span>•</span>
                  <span>Penyelenggara: <strong>{item.organizer}</strong></span>
                </div>
              </div>

              {item.coachTeacher && (
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Guru Pembimbing: <strong className="text-slate-600 dark:text-slate-300">{item.coachTeacher}</strong></span>
                  {item.notes && <span className="text-slate-500">{item.notes}</span>}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs">
            Belum ada catatan perolehan prestasi siswa.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Catat Prestasi Siswa
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
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nama Siswa</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    placeholder="Nama siswa..."
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    list="achievement-students"
                    required
                  />
                  <datalist id="achievement-students">
                    {studentList.map(s => (
                      <option key={s.id} value={s.nama} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Nama Kejuaraan / Kompetisi</label>
                <input
                  type="text"
                  value={achievementTitle}
                  onChange={e => setAchievementTitle(e.target.value)}
                  placeholder="Contoh: Olimpiade Sains Nasional (OSN) Bidang Fisika..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Bidang</label>
                  <select
                    value={field}
                    onChange={e => setField(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Sains / Olimpiade">Sains / OSN</option>
                    <option value="Akademik">Akademik</option>
                    <option value="Olahraga">Olahraga</option>
                    <option value="Seni & Budaya">Seni & Budaya</option>
                    <option value="Teknologi / Robotik">Robotik / IT</option>
                    <option value="Keagamaan / MTQ">Keagamaan</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tingkat</label>
                  <select
                    value={competitionLevel}
                    onChange={e => setCompetitionLevel(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Sekolah">Sekolah</option>
                    <option value="Kecamatan">Kecamatan</option>
                    <option value="Kota / Kabupaten">Kota / Kab</option>
                    <option value="Provinsi">Provinsi</option>
                    <option value="Nasional">Nasional</option>
                    <option value="Internasional">Internasional</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Peringkat / Juara</label>
                  <select
                    value={rank}
                    onChange={e => setRank(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Juara 1">Juara 1</option>
                    <option value="Juara 2">Juara 2</option>
                    <option value="Juara 3">Juara 3</option>
                    <option value="Harapan 1">Harapan 1</option>
                    <option value="Finalis">Finalis</option>
                    <option value="Best Speaker / Participant">Best Participant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Lembaga Penyelenggara</label>
                <input
                  type="text"
                  value={organizer}
                  onChange={e => setOrganizer(e.target.value)}
                  placeholder="Contoh: Kemendikbudristek RI / PUSPRESNAS..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Guru Pembimbing</label>
                  <input
                    type="text"
                    value={coachTeacher}
                    onChange={e => setCoachTeacher(e.target.value)}
                    placeholder="Nama guru pembimbing..."
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Catatan Tambahan</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Contoh: Medali Emas..."
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Prestasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
