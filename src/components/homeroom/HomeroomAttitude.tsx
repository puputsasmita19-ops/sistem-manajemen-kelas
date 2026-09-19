import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  Smile,
  Award,
  Search,
  Plus,
  Trash2,
  Edit3,
  Printer,
  Sparkles,
  CheckCircle2,
  Heart
} from 'lucide-react';
import { AttitudeAssessmentItem } from '../../types/homeroom';
import { HomeroomService } from '../../services/homeroomService';

interface HomeroomAttitudeProps {
  classId: string;
  className: string;
  assessments: AttitudeAssessmentItem[];
  studentList: Array<{ id: string; nama: string }>;
  onRefresh: () => void;
}

export const HomeroomAttitude: React.FC<HomeroomAttitudeProps> = ({
  classId,
  className,
  assessments,
  studentList,
  onRefresh
}) => {
  const service = HomeroomService.getInstance();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AttitudeAssessmentItem | null>(null);

  // Form State
  const [studentName, setStudentName] = useState('');
  const [spiritualScore, setSpiritualScore] = useState<AttitudeAssessmentItem['spiritualScore']>('SB');
  const [socialScore, setSocialScore] = useState<AttitudeAssessmentItem['socialScore']>('B');
  const [notes, setNotes] = useState('');

  const filtered = assessments.filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      a.studentName.toLowerCase().includes(q) ||
      (a.specialNotes && a.specialNotes.toLowerCase().includes(q)) ||
      a.spiritualDescription.toLowerCase().includes(q) ||
      a.socialDescription.toLowerCase().includes(q)
    );
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName) return;

    service.saveAttitudeAssessment(classId, {
      id: `att_${Date.now()}`,
      class_id: classId,
      studentId: `std_${Date.now()}`,
      studentName,
      spiritualScore,
      spiritualDescription:
        spiritualScore === 'SB'
          ? 'Sangat taat beribadah, konsisten berdoa, dan toleran terhadap sesama.'
          : 'Baik dalam ketaatan beribadah dan menghormati keyakinan orang lain.',
      socialScore,
      socialDescription:
        socialScore === 'SB'
          ? 'Menunjukkan sikap santun, integritas tinggi, dan proaktif bekerjasama.'
          : 'Memiliki kepedulian sosial yang baik dan menghargai teman sebaya.',
      specialNotes: notes || 'Perkembangan karakter dan budi pekerti sangat positif.',
      incidents: []
    });

    setShowAddModal(false);
    setStudentName('');
    setNotes('');
    onRefresh();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    service.saveAttitudeAssessment(classId, editingItem);
    setEditingItem(null);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'Hapus Penilaian Sikap?',
      text: 'Catatan penilaian sikap siswa ini akan dihapus dari buku rapor.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#eab308',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        service.deleteAttitudeAssessment(classId, id);
        onRefresh();
      }
    });
  };

  const getScoreBadge = (sc: 'SB' | 'B' | 'C' | 'PB') => {
    switch (sc) {
      case 'SB':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'B':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'C':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'PB':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
    }
  };

  const scoreLabel = (sc: 'SB' | 'B' | 'C' | 'PB') => {
    switch (sc) {
      case 'SB':
        return 'Sangat Baik';
      case 'B':
        return 'Baik';
      case 'C':
        return 'Cukup';
      case 'PB':
        return 'Perlu Bimbingan';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-950/70 text-yellow-800 dark:text-yellow-300 text-xs font-black">
              MENU 11
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Penilaian Sikap Spiritual & Sosial ({className})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Observasi perkembangan karakter, integritas, profil pelajar Pancasila, dan catatan rapor
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap Sikap</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center gap-1.5 shadow-xs shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Input Nilai Sikap</span>
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
          placeholder="Cari siswa atau catatan penilaian..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">No</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-3 text-center">Sikap Spiritual</th>
                <th className="py-3 px-3 text-center">Sikap Sosial</th>
                <th className="py-3 px-4">Deskripsi Observasi Rapor</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtered.length > 0 ? (
                filtered.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-amber-50/20 dark:hover:bg-amber-950/20 transition-colors"
                  >
                    <td className="py-3 px-3 font-semibold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{item.studentName}</div>
                      <div className="text-[10px] font-normal text-slate-400">ID: {item.studentId}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black ${getScoreBadge(item.spiritualScore)}`}>
                        {item.spiritualScore} ({scoreLabel(item.spiritualScore)})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black ${getScoreBadge(item.socialScore)}`}>
                        {item.socialScore} ({scoreLabel(item.socialScore)})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <div>{item.specialNotes}</div>
                      <div className="text-[10px] text-slate-400 italic mt-0.5">
                        Spiritual: {item.spiritualDescription}
                      </div>
                      <div className="text-[10px] text-slate-400 italic mt-0.5">
                        Sosial: {item.socialDescription}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingItem({ ...item })}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Belum ada rekaman penilaian sikap.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Input Penilaian Sikap Siswa
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
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Nama Siswa</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="Ketik atau pilih siswa..."
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  list="attitude-students"
                  required
                />
                <datalist id="attitude-students">
                  {studentList.map(s => (
                    <option key={s.id} value={s.nama} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Sikap Spiritual</label>
                  <select
                    value={spiritualScore}
                    onChange={e => setSpiritualScore(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="SB">SB (Sangat Baik)</option>
                    <option value="B">B (Baik)</option>
                    <option value="C">C (Cukup)</option>
                    <option value="PB">PB (Perlu Bimbingan)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Sikap Sosial</label>
                  <select
                    value={socialScore}
                    onChange={e => setSocialScore(e.target.value as any)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="SB">SB (Sangat Baik)</option>
                    <option value="B">B (Baik)</option>
                    <option value="C">C (Cukup)</option>
                    <option value="PB">PB (Perlu Bimbingan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Catatan Observasi Karakter (Untuk Rapor)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Catatan perkembangan karakter dan perilaku siswa..."
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Penilaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Edit Penilaian ({editingItem.studentName})
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
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Spiritual</label>
                  <select
                    value={editingItem.spiritualScore}
                    onChange={e => setEditingItem({ ...editingItem, spiritualScore: e.target.value as any })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="SB">SB</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="PB">PB</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Sosial</label>
                  <select
                    value={editingItem.socialScore}
                    onChange={e => setEditingItem({ ...editingItem, socialScore: e.target.value as any })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="SB">SB</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="PB">PB</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Catatan Khusus</label>
                <textarea
                  rows={3}
                  value={editingItem.specialNotes || ''}
                  onChange={e => setEditingItem({ ...editingItem, specialNotes: e.target.value })}
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
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
