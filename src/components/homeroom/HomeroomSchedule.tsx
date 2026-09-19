import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  Calendar,
  Clock,
  BookOpen,
  UserCheck,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Search,
  MapPin
} from 'lucide-react';
import { LessonScheduleItem } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';

interface HomeroomScheduleProps {
  classId: string;
  className: string;
  schedules: LessonScheduleItem[];
  onRefresh: () => void;
}

const DAYS: Array<'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat'> = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat'
];

export const HomeroomSchedule: React.FC<HomeroomScheduleProps> = ({
  classId,
  className,
  schedules,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [activeDay, setActiveDay] = useState<'Semua' | 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [day, setDay] = useState<'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat'>('Senin');
  const [periodNumber, setPeriodNumber] = useState(1);
  const [timeRange, setTimeRange] = useState('07:15 - 08:45');
  const [subjectName, setSubjectName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [room, setRoom] = useState('R. ' + className);

  const filtered = schedules.filter(s => {
    const matchDay = activeDay === 'Semua' || s.day === activeDay;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      s.subjectName.toLowerCase().includes(q) ||
      s.teacherName.toLowerCase().includes(q) ||
      s.room.toLowerCase().includes(q);
    return matchDay && matchSearch;
  });

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName || !teacherName) return;

    service.addLessonSchedule(classId, {
      day,
      periodNumber: Number(periodNumber),
      timeRange,
      subjectName,
      teacherName,
      room
    });

    setShowAddModal(false);
    setSubjectName('');
    setTeacherName('');
    onRefresh();
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Jadwal Pelajaran?',
      text: 'Jadwal pelajaran ini akan dihapus dari daftar jadwal kelas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.deleteLessonSchedule(classId, id);
        onRefresh();
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-xs font-black">
              MENU 1
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Daftar Pelajaran ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Jadwal kegiatan belajar mengajar mingguan kelas reguler tahun ajaran aktif
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            title="Cetak Jadwal Pelajaran"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Jadwal</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Jadwal</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveDay('Semua')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeDay === 'Semua'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Semua Hari ({schedules.length})
          </button>
          {DAYS.map(d => {
            const count = schedules.filter(s => s.day === d).length;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setActiveDay(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  activeDay === d
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{d}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari mapel / guru / ruang..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Schedule Table / Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Hari</th>
                <th className="py-3 px-3">Jam Ke</th>
                <th className="py-3 px-3">Waktu</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Guru Pengampu</th>
                <th className="py-3 px-3">Ruangan</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtered.length > 0 ? (
                filtered.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[11px]">
                        {item.day}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">
                      Ke-{item.periodNumber}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.timeRange}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{item.subjectName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{item.teacherName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>{item.room}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                        title="Hapus jadwal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada jadwal pelajaran yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Jadwal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Tambah Jadwal Pelajaran
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Hari</label>
                  <select
                    value={day}
                    onChange={e => setDay(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    {DAYS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Jam Ke-</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={periodNumber}
                    onChange={e => setPeriodNumber(Number(e.target.value))}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Rentang Waktu</label>
                <input
                  type="text"
                  value={timeRange}
                  onChange={e => setTimeRange(e.target.value)}
                  placeholder="Contoh: 07:15 - 08:45"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Mata Pelajaran</label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={e => setSubjectName(e.target.value)}
                  placeholder="Contoh: Fisika, Matematika Peminatan"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Guru Pengampu</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  placeholder="Contoh: Siti Rahmawati, M.Pd"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Ruangan</label>
                <input
                  type="text"
                  value={room}
                  onChange={e => setRoom(e.target.value)}
                  placeholder="Contoh: R. 10 MIPA 1 / Lab Fisika"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
