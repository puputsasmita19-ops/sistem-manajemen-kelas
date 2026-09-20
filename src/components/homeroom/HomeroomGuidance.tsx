import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  HeartHandshake,
  Plus,
  Trash2,
  Edit3,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  UserCheck
} from 'lucide-react';
import { ClassGuidanceItem } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';
import { HomeroomPdfExporter } from '../../services/homeroomPdfExporter';

interface HomeroomGuidanceProps {
  classId: string;
  className: string;
  guidanceLogs: ClassGuidanceItem[];
  studentList: Array<{ id: string; nama: string }>;
  onRefresh: () => void;
}

export const HomeroomGuidance: React.FC<HomeroomGuidanceProps> = ({
  classId,
  className,
  guidanceLogs,
  studentList,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ClassGuidanceItem | null>(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentName, setStudentName] = useState('');
  const [guidanceType, setGuidanceType] = useState<ClassGuidanceItem['guidanceType']>('Akademik / Belajar');
  const [problemDescription, setProblemDescription] = useState('');
  const [counselingGiven, setCounselingGiven] = useState('');
  const [followUpPlan, setFollowUpPlan] = useState('');
  const [status, setStatus] = useState<ClassGuidanceItem['status']>('Dalam Proses');

  const filtered = guidanceLogs.filter(g => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      g.studentName.toLowerCase().includes(q) ||
      g.problemDescription.toLowerCase().includes(q) ||
      g.guidanceType.toLowerCase().includes(q)
    );
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !problemDescription) return;

    service.addGuidanceLog(classId, {
      date,
      studentId: `std_${Date.now()}`,
      studentName,
      guidanceType,
      problemDescription,
      counselingGiven,
      followUpPlan,
      status
    });

    setShowAddModal(false);
    setProblemDescription('');
    setCounselingGiven('');
    setFollowUpPlan('');
    onRefresh();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    service.updateGuidanceLog(classId, editingItem);
    setEditingItem(null);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Catatan Pembimbingan?',
      text: 'Catatan bimbingan siswa ini akan dihapus permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ec4899',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.deleteGuidanceLog(classId, id);
        onRefresh();
      }
    });
  };

  const statusBadge = (st: ClassGuidanceItem['status']) => {
    switch (st) {
      case 'Selesai':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
      case 'Dalam Proses':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
      case 'Perlu Monitoring':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
      case 'Dirujuk ke Guru BK':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300 text-xs font-black">
              MENU 9
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Kegiatan Pembimbingan Kelas / Konseling ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Buku catatan bimbingan akademik, kepribadian, sosial, dan motivasi belajar peserta didik
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => HomeroomPdfExporter.exportGuidancePDF(className, guidanceLogs)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Catatan Bimbingan</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-pink-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Bimbingan Baru</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari bimbingan berdasarkan nama siswa atau jenis masalah..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-500 text-slate-800 dark:text-slate-200"
        />
      </div>

      {/* Guidance Cards / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length > 0 ? (
          filtered.map(item => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3 hover:border-pink-300 dark:hover:border-pink-800 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-500">{item.date}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-[11px] font-black text-pink-600 dark:text-pink-400">
                      {item.guidanceType}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.studentName}
                  </h4>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${statusBadge(item.status)}`}>
                  {item.status}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Permasalahan / Topik Bimbingan:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300">{item.problemDescription}</p>
                </div>

                <div className="p-2.5 bg-pink-50/50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/40 rounded-xl space-y-0.5">
                  <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 uppercase tracking-wider block">
                    Arahan & Solusi Wali Kelas:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200">{item.counselingGiven}</p>
                </div>

                {item.followUpPlan && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    🎯 Rencana Tindak Lanjut: <strong>{item.followUpPlan}</strong>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem({ ...item })}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition"
                >
                  Edit Catatan
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs">
            Belum ada catatan pembimbingan kelas.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Catat Bimbingan Siswa
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
                  <label className="font-bold text-slate-700 dark:text-slate-300">Bidang Bimbingan</label>
                  <select
                    value={guidanceType}
                    onChange={e => setGuidanceType(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Akademik / Belajar">Akademik / Belajar</option>
                    <option value="Pribadi">Pribadi</option>
                    <option value="Sosial / Pertemanan">Sosial / Pertemanan</option>
                    <option value="Kedisiplinan / Karakter">Kedisiplinan / Karakter</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Nama Siswa</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="Ketik nama siswa..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  list="guidance-students"
                  required
                />
                <datalist id="guidance-students">
                  {studentList.map(s => (
                    <option key={s.id} value={s.nama} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Uraian Masalah / Kondisi Siswa
                </label>
                <textarea
                  rows={2}
                  value={problemDescription}
                  onChange={e => setProblemDescription(e.target.value)}
                  placeholder="Jelaskan pokok permasalahan yang dialami peserta didik..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Bimbingan / Pengarahan yang Diberikan
                </label>
                <textarea
                  rows={2}
                  value={counselingGiven}
                  onChange={e => setCounselingGiven(e.target.value)}
                  placeholder="Solusi, nasehat, atau teknik pembimbingan yang dilakukan..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tindak Lanjut</label>
                  <input
                    type="text"
                    value={followUpPlan}
                    onChange={e => setFollowUpPlan(e.target.value)}
                    placeholder="Rencana monitoring selanjutnya..."
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="Dalam Proses">Dalam Proses</option>
                    <option value="Perlu Monitoring">Perlu Monitoring</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Dirujuk ke Guru BK">Dirujuk ke Guru BK</option>
                  </select>
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
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Bimbingan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Edit Catatan Bimbingan ({editingItem.studentName})
              </h4>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={editingItem.status}
                  onChange={e => setEditingItem({ ...editingItem, status: e.target.value as any })}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                >
                  <option value="Dalam Proses">Dalam Proses</option>
                  <option value="Perlu Monitoring">Perlu Monitoring</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Dirujuk ke Guru BK">Dirujuk ke Guru BK</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Arahan & Solusi</label>
                <textarea
                  rows={2}
                  value={editingItem.counselingGiven}
                  onChange={e => setEditingItem({ ...editingItem, counselingGiven: e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Tindak Lanjut</label>
                <input
                  type="text"
                  value={editingItem.followUpPlan}
                  onChange={e => setEditingItem({ ...editingItem, followUpPlan: e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
